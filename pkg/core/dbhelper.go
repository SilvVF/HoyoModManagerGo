package core

import (
	"context"
	"database/sql"
	"errors"
	"hmm/db"
	"hmm/pkg/log"
	"hmm/pkg/types"
	"sort"
	"strings"
)

type DbHelper struct {
	queries *db.Queries
	ctx     context.Context
}

func NewDbHelper(queries *db.Queries) *DbHelper {

	ctx := context.Background()

	return &DbHelper{
		ctx:     ctx,
		queries: queries,
	}
}

func characterFromDb(c db.Character) types.Character {
	return types.Character{
		Id:        int(c.ID),
		Game:      types.Game(c.Game),
		Name:      c.Name,
		AvatarUrl: c.AvatarUrl,
		Element:   c.Element,
	}
}

func modFromDb(m db.Mod) types.Mod {
	return types.Mod{
		Filename:       m.ModFilename,
		Game:           types.Game(m.Game),
		Character:      m.CharName,
		CharacterId:    int(m.CharID),
		Enabled:        m.Selected,
		PreviewImages:  strings.Split(m.PreviewImages, ","),
		GbId:           int(m.GbID.Int64),
		ModLink:        m.ModLink.String,
		GbFileName:     m.GbFileName.String,
		GbDownloadLink: m.GbDownloadLink.String,
		Id:             int(m.ID),
	}
}

func (h *DbHelper) SelectClosestCharacter(name string, game types.Game) (types.Character, error) {
	value, err := h.queries.SelectClosestCharacter(h.ctx, db.SelectClosestCharacterParams{Name: name, Game: int64(game)})
	if err != nil {
		return types.Character{}, err
	}
	return types.Character{
		Id:        int(value.ID),
		Game:      types.Game(value.Game),
		Name:      value.Name,
		AvatarUrl: value.AvatarUrl,
		Element:   value.Element,
	}, nil
}

func (h *DbHelper) UpsertCharacter(c types.Character) error {

	if c.Name != "" && c.Id != 0 {
		return h.queries.UpsertCharacter(h.ctx, db.UpsertCharacterParams{
			ID:        int64(c.Id),
			Game:      int64(c.Game),
			Name:      c.Name,
			AvatarUrl: c.AvatarUrl,
			Element:   c.Element,
		})
	}
	return errors.New("name was empty")
}

func (h *DbHelper) DeleteUnusedMods(fileNames []string, game types.Game) {
	h.queries.DeleteUnusedMods(h.ctx, db.DeleteUnusedModsParams{
		Files: fileNames,
		Game:  int64(game),
	})
}

func (h *DbHelper) InsertMod(m types.Mod) {
	h.queries.InsertMod(h.ctx, db.InsertModParams{
		ModFilename:    m.Filename,
		Game:           int64(m.Game),
		CharName:       m.Character,
		CharId:         int64(m.CharacterId),
		Selected:       m.Enabled,
		PreviewImages:  strings.Join(m.PreviewImages, ","),
		GbId:           sql.NullInt64{Int64: int64(m.GbId)},
		ModLink:        sql.NullString{String: m.ModLink},
		GbFilename:     sql.NullString{String: m.GbFileName},
		GbDownloadLink: sql.NullString{String: m.GbDownloadLink},
	})
}

func (h *DbHelper) SelectCharactersByGame(game types.Game) []types.Character {
	characters, err := h.queries.SelectCharactersByGame(h.ctx, int64(game))

	if err != nil {
		return make([]types.Character, 0)
	}

	result := make([]types.Character, 0, len(characters))

	for _, c := range characters {
		result = append(result, characterFromDb(c))
	}

	return result
}

func (h *DbHelper) SelectModsByCharacterName(name string, game types.Game) ([]types.Mod, error) {
	mods, err := h.queries.SelectModsByCharacterName(h.ctx, db.SelectModsByCharacterNameParams{Name: name, Game: int64(game)})
	if err != nil {
		return make([]types.Mod, 0), err
	}

	result := make([]types.Mod, 0, len(mods))

	for _, m := range mods {
		result = append(result, modFromDb(m))
	}

	return result, nil
}

func (h *DbHelper) SelectCharacterWithModsAndTags(game types.Game, modFileName string, characterName string, tagName string) []types.CharacterWithModsAndTags {

	res, err := h.queries.SelectCharactersWithModsAndTags(h.ctx, db.SelectCharactersWithModsAndTagsParams{
		Game:          int64(game),
		ModFileName:   sql.NullString{Valid: modFileName != "", String: modFileName},
		CharacterName: sql.NullString{Valid: characterName != "", String: characterName},
		TagName:       sql.NullString{Valid: tagName != "", String: tagName},
	})

	if err != nil {
		log.LogError(err.Error())
		return make([]types.CharacterWithModsAndTags, 0)
	}

	var charMap = map[types.Character]*struct {
		Mods []types.Mod
		Tags []types.Tag
	}{}

	for _, item := range res {
		char := types.Character{
			Id:        int(item.ID),
			Game:      types.Game(item.Game),
			Name:      item.Name,
			AvatarUrl: item.AvatarUrl,
			Element:   item.Element,
		}

		if _, ok := charMap[char]; !ok {
			charMap[char] = &struct {
				Mods []types.Mod
				Tags []types.Tag
			}{
				make([]types.Mod, 0),
				make([]types.Tag, 0),
			}
		}

		if item.ModFilename.Valid {
			charMap[char].Mods = append(charMap[char].Mods, types.Mod{
				Filename:       item.ModFilename.String,
				Game:           types.Game(item.Game),
				Character:      item.CharName.String,
				CharacterId:    int(item.CharID.Int64),
				Enabled:        item.Selected.Bool,
				PreviewImages:  strings.Split(item.PreviewImages.String, ","),
				GbId:           int(item.GbID.Int64),
				ModLink:        item.ModLink.String,
				GbFileName:     item.GbFileName.String,
				GbDownloadLink: item.GbDownloadLink.String,
				Id:             int(item.ModID.Int64),
			})
		}

		if item.TagName.Valid {
			charMap[char].Tags = append(charMap[char].Tags, types.Tag{
				ModId: int(item.ModID.Int64),
				Name:  item.TagName.String,
			})
		}
	}

	keys := make([]types.Character, 0, len(charMap))

	for k := range charMap {
		keys = append(keys, k)
	}

	sort.Slice(keys, func(i, j int) bool {
		return keys[i].Name < keys[j].Name
	})

	lst := make([]types.CharacterWithModsAndTags, 0, len(charMap))

	for _, key := range keys {
		v := charMap[key]
		var cv types.CharacterWithModsAndTags

		cv.Character = key
		cv.Mods = v.Mods
		cv.Tags = v.Tags

		lst = append(lst, cv)
	}

	return lst
}
