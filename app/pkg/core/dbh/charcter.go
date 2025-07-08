package dbh

import (
	"database/sql"
	"errors"
	"hmm/db"
	"hmm/pkg/log"
	"hmm/pkg/types"
	"slices"
	"sort"
	"strings"
)

type CharacterDao interface {
	SelectClosestCharacter(name string, game types.Game) (types.Character, error)
	deleteCharcterById(id int64) error
	UpsertCharacter(c types.Character) error
	SelectCharactersByGame(game types.Game) ([]types.Character, error)
	SelectCharacterWithModsTagsAndTextures(game types.Game, modFileName string, characterName string, tagName string) ([]types.CharacterWithModsAndTags, error)
}

var _ CharacterDao = (*DbHelper)(nil)

func characterFromDb(c db.Character) types.Character {
	return types.Character{
		Id:        int(c.ID),
		Game:      types.Game(c.Game),
		Name:      c.Name,
		AvatarUrl: c.AvatarUrl,
		Element:   c.Element,
		Custom:    c.Flags&CHAR_FLAG_IS_CUSTOM != 0,
	}
}

func (h *DbHelper) SelectCharactersByGame(game types.Game) ([]types.Character, error) {
	characters, err := h.queries.SelectCharactersByGame(h.ctx, game.Int64())

	if err != nil {
		return make([]types.Character, 0), err
	}

	result := make([]types.Character, 0, len(characters))

	for _, c := range characters {
		result = append(result, characterFromDb(c))
	}

	return result, nil
}

func (h *DbHelper) SelectClosestCharacter(name string, game types.Game) (types.Character, error) {
	value, err := h.queries.SelectClosestCharacter(h.ctx, db.SelectClosestCharacterParams{Name: name, Game: int64(game)})
	if err != nil {
		return types.Character{}, err
	}
	return characterFromDb(value), nil
}

func (h *DbHelper) deleteCharacterById(id int64) error {
	return h.queries.DeleteCharacterById(h.ctx, id)
}

func (h *DbHelper) UpsertCharacter(c types.Character) error {

	const upsertCharacterQuery = `
		INSERT INTO character(id, game, name, avatar_url, element, flags) 
		VALUES(?, ?, ?, ?, ?, ?) 
		ON CONFLICT (id, game) 
		DO UPDATE SET 
			avatar_url = ?,
			name = ?,
			element = ?,
			flags = ?
	`

	if c.Name != "" && c.Id != 0 {

		flags := 0

		if c.Custom {
			flags |= CHAR_FLAG_IS_CUSTOM
		}

		_, err := h.db.ExecContext(h.ctx, upsertCharacterQuery,
			c.Id,
			c.Game,
			c.Name,
			c.AvatarUrl,
			c.Element,
			flags,
			c.AvatarUrl,
			c.Name,
			c.Element,
			flags,
		)
		return err
	}
	return errors.New("name was empty")
}

func (h *DbHelper) SelectCharacterWithModsTagsAndTextures(game types.Game, modFileName string, characterName string, tagName string) ([]types.CharacterWithModsAndTags, error) {
	res, err := h.queries.SelectCharactersWithModsAndTags(h.ctx, db.SelectCharactersWithModsAndTagsParams{
		Game:          game.Int64(),
		ModFileName:   sql.NullString{Valid: modFileName != "", String: modFileName},
		CharacterName: sql.NullString{Valid: characterName != "", String: characterName},
		TagName:       sql.NullString{Valid: tagName != "", String: tagName},
	})

	if err != nil {
		log.LogError(err.Error())
		return make([]types.CharacterWithModsAndTags, 0), err
	}

	charMap := make(map[types.Character]map[int]*types.ModWithTags)

	for _, item := range res {
		char := types.Character{
			Id:        int(item.ID),
			Game:      types.Game(item.Game),
			Name:      item.Name,
			AvatarUrl: item.AvatarUrl,
			Element:   item.Element,
			Custom:    item.Flags&CHAR_FLAG_IS_CUSTOM != 0,
		}

		if _, exists := charMap[char]; !exists {
			charMap[char] = make(map[int]*types.ModWithTags)
		}

		if item.ID_2.Valid {
			modId := int(item.ID_2.Int64)
			if _, exists := charMap[char][modId]; !exists {
				charMap[char][modId] = &types.ModWithTags{
					Mod: types.Mod{
						Filename:       item.Fname.String,
						Game:           types.Game(item.Game),
						Character:      item.CharName.String,
						CharacterId:    int(item.CharID.Int64),
						Enabled:        item.Selected.Bool,
						PreviewImages:  strings.Split(item.PreviewImages.String, "<seperator>"),
						GbId:           int(item.GbID.Int64),
						ModLink:        item.ModLink.String,
						GbFileName:     item.GbFileName.String,
						GbDownloadLink: item.GbDownloadLink.String,
						Id:             modId,
					},
					Tags:     []types.Tag{},
					Textures: []types.Texture{},
				}
			}
		}

		if item.TagName.Valid && item.ModID.Valid {
			modId := int(item.ModID.Int64)
			if modEntry, ok := charMap[char][modId]; ok {
				modEntry.Tags = append(modEntry.Tags, types.Tag{
					ModId: modId,
					Name:  item.TagName.String,
				})
			}
		}

		if item.ID_3.Valid && item.ModID_2.Valid {
			modId := int(item.ModID_2.Int64)
			if modEntry, ok := charMap[char][modId]; ok {
				modEntry.Textures = append(modEntry.Textures, types.Texture{
					Filename:       item.Fname_2.String,
					Enabled:        item.Selected_2.Bool,
					PreviewImages:  strings.Split(item.PreviewImages_2.String, "<seperator>"),
					GbId:           int(item.GbID_2.Int64),
					ModLink:        item.ModLink_2.String,
					GbFileName:     item.GbFileName_2.String,
					GbDownloadLink: item.GbDownloadLink_2.String,
					ModId:          modId,
					Id:             int(item.ID_3.Int64),
				})
			}
		}
	}

	keys := make([]types.Character, 0, len(charMap))
	for k := range charMap {
		keys = append(keys, k)
	}
	sort.Slice(keys, func(i, j int) bool {

		if keys[i].Name == keys[j].Name {
			return keys[i].Id < keys[j].Id
		}

		return keys[i].Name < keys[j].Name
	})

	result := make([]types.CharacterWithModsAndTags, 0, len(charMap))
	for _, char := range keys {
		modMap := charMap[char]
		mods := make([]types.ModWithTags, 0, len(modMap))
		for _, mwt := range modMap {
			mods = append(mods, *mwt)
		}
		slices.SortFunc(mods, func(a, b types.ModWithTags) int {
			return strings.Compare(a.Mod.Filename, b.Mod.Filename)
		})
		result = append(result, types.CharacterWithModsAndTags{
			Character:   char,
			ModWithTags: mods,
		})
	}

	return result, nil
}
