package core

import (
	"bytes"
	"context"
	"database/sql"
	"errors"
	"fmt"
	"hmm/db"
	"hmm/pkg/log"
	"hmm/pkg/types"
	"os"
	"path"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
)

type DbHelper struct {
	queries *db.Queries
	ctx     context.Context
	db      db.DBTX
}

func NewDbHelper(queries *db.Queries, db db.DBTX) *DbHelper {

	ctx := context.Background()

	return &DbHelper{
		ctx:     ctx,
		queries: queries,
		db:      db,
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
		Filename:       m.Fname,
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

func (h *DbHelper) SelectModById(id int) (types.Mod, error) {
	m, err := h.queries.SelectModById(h.ctx, int64(id))
	if err != nil {
		return types.Mod{}, err
	}
	return modFromDb(m), nil
}

func (h *DbHelper) SelectEnabledModsByGame(game types.Game) ([]types.Mod, error) {
	m, err := h.queries.SelectEnabledModsForGame(h.ctx, int64(game))
	if err != nil {
		return make([]types.Mod, 0), err
	}
	mods := make([]types.Mod, 0, len(m))
	for _, mod := range m {
		mods = append(mods, modFromDb(mod))
	}
	return mods, nil
}

const upsertCharacter = `INSERT INTO character(id, game, name, avatar_url, element) 
VALUES(?, ?, ?, ?, ?) ON CONFLICT (id, game) DO UPDATE SET 
    avatar_url = ?,
    name = ?,
    element = ?
`

func (h *DbHelper) UpsertCharacter(c types.Character) error {

	if c.Name != "" && c.Id != 0 {
		_, err := h.db.ExecContext(h.ctx, upsertCharacter,
			c.Id,
			c.Game,
			c.Name,
			c.AvatarUrl,
			c.Element,
			c.AvatarUrl,
			c.Name,
			c.Element,
		)
		return err
	}
	return errors.New("name was empty")
}

func deleteUnusedModsQuery(fnames []string, game types.Game) string {

	for i, name := range fnames {
		fnames[i] = fmt.Sprintf("\"%s\"", name)
	}

	var fileArg string
	if len(fnames) == 0 {
		fileArg = "NULL"
	} else {
		fileArg = "(" + strings.Join(fnames, ",") + ")"
	}

	return fmt.Sprintf(
		"DELETE FROM mod WHERE fname NOT IN %s AND game = %d",
		fileArg,
		game,
	)
}

func (h *DbHelper) DeleteUnusedMods(fileNames []string, game types.Game) error {
	query := deleteUnusedModsQuery(fileNames, game)
	log.LogDebug(query)
	_, err := h.db.ExecContext(h.ctx, query)
	return err
}

func (h *DbHelper) DeleteModById(id int) error {
	return h.queries.DeleteModById(h.ctx, int64(id))
}

func (h *DbHelper) EnableModById(enabled bool, id int) error {
	return h.queries.UpdateModEnabledById(h.ctx, db.UpdateModEnabledByIdParams{
		Selected: enabled,
		ID:       int64(id),
	})
}

func (h *DbHelper) InsertMod(m types.Mod) error {
	return h.queries.InsertMod(h.ctx, db.InsertModParams{
		ModFilename:    m.Filename,
		Game:           int64(m.Game),
		CharName:       m.Character,
		CharId:         int64(m.CharacterId),
		Selected:       m.Enabled,
		PreviewImages:  strings.Join(m.PreviewImages, ","),
		GbId:           sql.NullInt64{Valid: m.GbId != 0, Int64: int64(m.GbId)},
		ModLink:        sql.NullString{Valid: m.ModLink != "", String: m.ModLink},
		GbFilename:     sql.NullString{Valid: m.GbFileName != "", String: m.GbFileName},
		GbDownloadLink: sql.NullString{Valid: m.GbDownloadLink != "", String: m.GbDownloadLink},
	})
}

func (h *DbHelper) SelectCharactersByGame(game types.Game) []types.Character {
	characters, err := h.queries.SelectCharactersByGame(h.ctx, game.Int64())

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
	mods, err := h.queries.SelectModsByCharacterName(h.ctx, db.SelectModsByCharacterNameParams{Name: name, Game: game.Int64()})
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
		Game:          game.Int64(),
		ModFileName:   sql.NullString{Valid: modFileName != "", String: modFileName},
		CharacterName: sql.NullString{Valid: characterName != "", String: characterName},
		TagName:       sql.NullString{Valid: tagName != "", String: tagName},
	})

	if err != nil {
		log.LogError(err.Error())
		return make([]types.CharacterWithModsAndTags, 0)
	}

	var charMap = map[types.Character][]types.ModWithTags{}

	for _, item := range res {
		char := types.Character{
			Id:        int(item.ID),
			Game:      types.Game(item.Game),
			Name:      item.Name,
			AvatarUrl: item.AvatarUrl,
			Element:   item.Element,
		}

		if _, ok := charMap[char]; !ok {
			charMap[char] = []types.ModWithTags{}
		}

		if item.ID_2.Valid {
			charMap[char] = append(charMap[char], types.ModWithTags{
				Mod: types.Mod{
					Filename:       item.Fname.String,
					Game:           types.Game(item.Game),
					Character:      item.CharName.String,
					CharacterId:    int(item.CharID.Int64),
					Enabled:        item.Selected.Bool,
					PreviewImages:  strings.Split(item.PreviewImages.String, ","),
					GbId:           int(item.GbID.Int64),
					ModLink:        item.ModLink.String,
					GbFileName:     item.GbFileName.String,
					GbDownloadLink: item.GbDownloadLink.String,
					Id:             int(item.ID_2.Int64),
				},
				Tags: make([]types.Tag, 0),
			})
		}

		if item.TagName.Valid && item.ModID.Valid {
			for _, modWithTags := range charMap[char] {
				modWithTags.Tags = append(modWithTags.Tags, types.Tag{
					Name:  item.TagName.String,
					ModId: int(item.ModID.Int64),
				})
			}
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
		cwmt := types.CharacterWithModsAndTags{
			Character:   key,
			ModWithTags: v,
		}

		lst = append(lst, cwmt)
	}

	return lst
}

func (h *DbHelper) SelectPlaylistWithModsAndTags(game types.Game) ([]types.PlaylistWithModsAndTags, error) {
	res, err := h.queries.SelectPlaylistWithModsAndTags(h.ctx, game.Int64())
	if err != nil {
		log.LogError(err.Error())
		return make([]types.PlaylistWithModsAndTags, 0), err
	}

	var playlistMap = map[types.Playlist][]types.ModWithTags{}

	for _, item := range res {
		playlist := types.Playlist{
			Id:   int(item.ID),
			Game: types.Game(item.Game),
			Name: item.PlaylistName,
		}

		if _, ok := playlistMap[playlist]; !ok {
			playlistMap[playlist] = []types.ModWithTags{}
		}

		playlistMap[playlist] = append(playlistMap[playlist], types.ModWithTags{
			Mod: types.Mod{
				Filename:       item.Fname,
				Game:           types.Game(item.Game),
				Character:      item.CharName,
				CharacterId:    int(item.CharID),
				Enabled:        item.Selected,
				PreviewImages:  strings.Split(item.PreviewImages, ","),
				GbId:           int(item.GbID.Int64),
				ModLink:        item.ModLink.String,
				GbFileName:     item.GbFileName.String,
				GbDownloadLink: item.GbDownloadLink.String,
				Id:             int(item.ID_2),
			},
			Tags: make([]types.Tag, 0),
		})

		if item.TagName.Valid && item.ModID.Valid {
			for _, modWithTags := range playlistMap[playlist] {
				modWithTags.Tags = append(modWithTags.Tags, types.Tag{
					Name:  item.TagName.String,
					ModId: int(item.ModID.Int64),
				})
			}
		}
	}

	keys := make([]types.Playlist, 0, len(playlistMap))

	for k := range playlistMap {
		keys = append(keys, k)
	}

	sort.Slice(keys, func(i, j int) bool {
		return keys[i].Name < keys[j].Name
	})

	lst := make([]types.PlaylistWithModsAndTags, 0, len(playlistMap))

	for _, key := range keys {
		v := playlistMap[key]
		cwmt := types.PlaylistWithModsAndTags{
			Playlist:     key,
			ModsWithTags: v,
		}

		lst = append(lst, cwmt)
	}

	return lst, nil
}

func arrayToString(A []int64, delim string) string {

	var buffer bytes.Buffer
	for i := 0; i < len(A); i++ {
		buffer.WriteString(strconv.Itoa(int(A[i])))
		if i != len(A)-1 {
			buffer.WriteString(delim)
		}
	}

	return buffer.String()
}

func (h *DbHelper) UpdateModsEnabledFromSlice(ids []int64, game types.Game) error {
	log.LogDebug(arrayToString(ids, ","))
	log.LogDebug(fmt.Sprintf("%d", game))
	return h.queries.UpdateModsEnabledFromSlice(h.ctx, db.UpdateModsEnabledFromSliceParams{
		Enabled: ids,
		Game:    game.Int64(),
	})
}

func (h *DbHelper) DeletePlaylistById(id int64) error {
	query := fmt.Sprintf("DELETE FROM playlist WHERE id = %d", id)
	log.LogDebug(query)
	_, err := h.db.ExecContext(h.ctx, query)
	return err
}

func (h *DbHelper) RenameMod(id int64, name string) error {
	dbmod, err := h.queries.SelectModById(h.ctx, id)
	if err != nil {
		return err
	}
	mod := modFromDb(dbmod)
	currDir := GetModDir(mod)
	newDir := path.Join(filepath.Dir(currDir), name)
	err = os.Rename(currDir, newDir)
	if err != nil {
		return err
	}
	query := fmt.Sprintf("UPDATE mod SET fname = \"%s\" WHERE id = %d;", name, id)
	log.LogDebug(query)
	_, err = h.db.ExecContext(h.ctx, query)
	return err
}

func (h *DbHelper) CreatePlaylist(game types.Game, name string) error {
	pid, err := h.queries.InsertPlaylist(h.ctx, db.InsertPlaylistParams{PlaylistName: name, Game: int64(game)})
	if err != nil {
		return err
	}
	enabled, err := h.SelectEnabledModsByGame(game)
	if err != nil {
		return err
	}

	for _, mod := range enabled {
		h.queries.InsertPlayListModCrossRef(h.ctx, db.InsertPlayListModCrossRefParams{
			PlaylistId: pid,
			ModId:      int64(mod.Id),
		})
	}

	return nil
}
