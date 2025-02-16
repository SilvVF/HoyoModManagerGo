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
	"hmm/pkg/util"
	"os"
	"path/filepath"
	"slices"
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

func textureFromDb(t db.Texture) types.Texture {

	previewImages := strings.Split(t.PreviewImages, "<seperator>")
	previewImages = slices.DeleteFunc(previewImages, func(i string) bool { return i == "" })

	return types.Texture{
		Filename:       t.Fname,
		Enabled:        t.Selected,
		PreviewImages:  previewImages,
		GbId:           int(t.GbID.Int64),
		ModLink:        t.ModLink.String,
		GbFileName:     t.GbFileName.String,
		GbDownloadLink: t.GbDownloadLink.String,
		Id:             int(t.ID),
		ModId:          int(t.ModID),
	}
}

func modFromDb(m db.Mod) types.Mod {

	previewImages := strings.Split(m.PreviewImages, "<seperator>")
	previewImages = slices.DeleteFunc(previewImages, func(i string) bool { return i == "" })

	return types.Mod{
		Filename:       m.Fname,
		Game:           types.Game(m.Game),
		Character:      m.CharName,
		CharacterId:    int(m.CharID),
		Enabled:        m.Selected,
		PreviewImages:  previewImages,
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

func (h *DbHelper) SelecteTextureById(id int) (types.Texture, error) {
	m, err := h.queries.SelectTextureById(h.ctx, int64(id))
	if err != nil {
		return types.Texture{}, err
	}
	return textureFromDb(m), nil
}

func (h *DbHelper) SelectModByCNameAndGame(fname, c string, g int64) (types.Mod, error) {
	m, err := h.queries.SelectModByCharAndGame(h.ctx, db.SelectModByCharAndGameParams{
		Fname:         fname,
		Game:          g,
		CharacterName: c,
	})
	if err != nil {
		return types.Mod{}, err
	}
	return modFromDb(m), nil
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
		fnames[i] = fmt.Sprintf("'%s'", name)
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

func (h *DbHelper) deleteUnusedTextures(textures []Pair[int, string]) error {
	modIds := []int64{}

	for _, v := range textures {
		modIds = append(modIds, int64(v.x))
	}

	arr, err := h.queries.SelectAllTexturesByModIds(h.ctx, modIds)
	if err != nil {
		return err
	}

	for _, t := range arr {
		keep := slices.ContainsFunc(textures, func(e Pair[int, string]) bool {
			return e.x == int(t.ModID) && e.y == t.Fname
		})
		if !keep {
			h.queries.DeleteTextureById(h.ctx, t.ID)
		}
	}
	return nil
}

func (h *DbHelper) deleteUnusedMods(fileNames []string, game types.Game) error {
	query := deleteUnusedModsQuery(fileNames, game)
	log.LogDebug(query)
	_, err := h.db.ExecContext(h.ctx, query)
	return err
}

func (h *DbHelper) DeleteModById(id int) error {
	return h.queries.DeleteModById(h.ctx, int64(id))
}

func (h *DbHelper) DeleteTextureById(id int) error {
	return h.queries.DeleteTextureById(h.ctx, int64(id))
}

func (h *DbHelper) EnableTextureById(enabled bool, id int) error {
	return h.queries.UpdateTextureEnabledById(h.ctx, db.UpdateTextureEnabledByIdParams{
		Selected: enabled,
		ID:       int64(id),
	})
}

func (h *DbHelper) EnableModById(enabled bool, id int) error {
	return h.queries.UpdateModEnabledById(h.ctx, db.UpdateModEnabledByIdParams{
		Selected: enabled,
		ID:       int64(id),
	})
}

func (h *DbHelper) InsertTexture(t types.Texture) (int64, error) {
	return h.queries.InsertTexture(h.ctx, db.InsertTextureParams{
		ModFilename:    t.Filename,
		ModId:          int64(t.ModId),
		Selected:       t.Enabled,
		PreviewImages:  strings.Join(t.PreviewImages, "<seperator>"),
		GbId:           sql.NullInt64{Valid: t.GbId != 0, Int64: int64(t.GbId)},
		ModLink:        sql.NullString{Valid: t.ModLink != "", String: t.ModLink},
		GbFilename:     sql.NullString{Valid: t.GbFileName != "", String: t.GbFileName},
		GbDownloadLink: sql.NullString{Valid: t.GbDownloadLink != "", String: t.GbDownloadLink},
	})
}

func (h *DbHelper) InsertMod(m types.Mod) (int64, error) {
	return h.queries.InsertMod(h.ctx, db.InsertModParams{
		ModFilename:    m.Filename,
		Game:           int64(m.Game),
		CharName:       m.Character,
		CharId:         int64(m.CharacterId),
		Selected:       m.Enabled,
		PreviewImages:  strings.Join(m.PreviewImages, "<seperator>"),
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

func (h *DbHelper) SelectEnabledTexturesByModId(id int) ([]types.Texture, error) {
	textures, err := h.queries.SelectEnabledTexturesByModId(h.ctx, int64(id))
	if err != nil {
		return make([]types.Texture, 0), err
	}

	result := make([]types.Texture, 0, len(textures))

	for _, t := range textures {
		result = append(result, textureFromDb(t))
	}

	return result, nil
}

func (h *DbHelper) SelectTexturesByModId(id int) ([]types.Texture, error) {
	textures, err := h.queries.SelectTexturesByModId(h.ctx, int64(id))
	if err != nil {
		return make([]types.Texture, 0), err
	}

	result := make([]types.Texture, 0, len(textures))

	for _, t := range textures {
		result = append(result, textureFromDb(t))
	}

	return result, nil
}

func (h *DbHelper) SelectModsByGbId(id int64) ([]types.Mod, error) {
	mods, err := h.queries.SelectModsByGbId(h.ctx, sql.NullInt64{Valid: true, Int64: id})
	if err != nil {
		return make([]types.Mod, 0), err
	}

	result := make([]types.Mod, 0, len(mods))

	for _, m := range mods {
		result = append(result, modFromDb(m))
	}

	return result, nil
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

func (h *DbHelper) SelectCharacterWithModsTagsAndTextures(game types.Game, modFileName string, characterName string, tagName string) []types.CharacterWithModsAndTags {

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

	var charMap = map[types.Character]map[int]*types.ModWithTags{}
	for _, item := range res {

		char := types.Character{
			Id:        int(item.ID),
			Game:      types.Game(item.Game),
			Name:      item.Name,
			AvatarUrl: item.AvatarUrl,
			Element:   item.Element,
		}

		if _, ok := charMap[char]; !ok {
			charMap[char] = map[int]*types.ModWithTags{}
		}

		modId := item.ID_2
		tagModId := item.ModID
		textureModId := item.ModID_2
		textureId := item.ID_3

		if modId.Valid {
			modWithTagsAndTextures := types.ModWithTags{
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
				Tags:     make([]types.Tag, 0),
				Textures: make([]types.Texture, 0),
			}
			charMap[char][int(modId.Int64)] = &modWithTagsAndTextures
		}

		if item.TagName.Valid && tagModId.Valid {
			charMap[char][int(modId.Int64)].Tags = append(charMap[char][int(modId.Int64)].Tags, types.Tag{ModId: int(tagModId.Int64), Name: item.TagName.String})
		}

		if textureId.Valid {
			charMap[char][int(modId.Int64)].Textures = append(charMap[char][int(modId.Int64)].Textures, types.Texture{
				Filename:       item.Fname_2.String,
				Enabled:        item.Selected_2.Bool,
				PreviewImages:  strings.Split(item.PreviewImages_2.String, ","),
				GbId:           int(item.GbID_2.Int64),
				ModLink:        item.ModLink_2.String,
				GbFileName:     item.GbFileName_2.String,
				GbDownloadLink: item.GbDownloadLink_2.String,
				ModId:          int(textureModId.Int64),
				Id:             int(textureId.Int64),
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

		arr := []types.ModWithTags{}

		for _, mwt := range v {
			arr = append(arr, *mwt)
		}

		slices.SortFunc(arr, func(a types.ModWithTags, b types.ModWithTags) int {
			return strings.Compare(a.Mod.Filename, b.Mod.Filename)
		})

		cwmt := types.CharacterWithModsAndTags{
			Character:   key,
			ModWithTags: arr,
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

func (h *DbHelper) DisableAllModsByGame(game types.Game) error {
	return h.queries.DisableAllModsByGame(h.ctx, game.Int64())
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

func (h *DbHelper) UpdateModImages(modId int64, images []string) error {
	m, err := h.queries.SelectModById(h.ctx, modId)
	if err != nil {
		return err
	}
	return h.queries.UpdateModDataById(h.ctx, db.UpdateModDataByIdParams{
		GbId:          m.GbID,
		PreviewImages: strings.Join(images, "<seperator>"),
		ModLink:       m.ModLink,
		Selected:      m.Selected,
		ID:            m.ID,
	})
}

func (h *DbHelper) UpdateModGbId(modId, gbId int64) error {
	m, err := h.queries.SelectModById(h.ctx, modId)
	if err != nil {
		return err
	}
	return h.queries.UpdateModDataById(h.ctx, db.UpdateModDataByIdParams{
		GbId:          sql.NullInt64{Valid: gbId != 0, Int64: gbId},
		PreviewImages: m.PreviewImages,
		ModLink:       m.ModLink,
		Selected:      m.Selected,
		ID:            m.ID,
	})
}

func (h *DbHelper) RenameTexture(id int64, name string) error {
	dbTexture, err := h.queries.SelectTextureById(h.ctx, id)
	if err != nil {
		return err
	}
	dbmod, err := h.queries.SelectModById(h.ctx, dbTexture.ModID)
	if err != nil {
		return err
	}
	texture := textureFromDb(dbTexture)
	currDir := filepath.Join(util.GetModDir(modFromDb(dbmod)), "textures", texture.Filename)
	newDir := filepath.Join(filepath.Dir(currDir), name)
	err = os.Rename(currDir, newDir)
	if err != nil {
		return err
	}
	query := fmt.Sprintf("UPDATE texture SET fname = '%s' WHERE id = %d;", name, id)
	log.LogDebug(query)
	_, err = h.db.ExecContext(h.ctx, query)
	return err
}

func (h *DbHelper) RenameMod(id int64, name string) error {
	dbmod, err := h.queries.SelectModById(h.ctx, id)
	if err != nil {
		return err
	}
	mod := modFromDb(dbmod)
	currDir := util.GetModDir(mod)
	newDir := filepath.Join(filepath.Dir(currDir), name)
	err = os.Rename(currDir, newDir)
	if err != nil {
		return err
	}
	query := fmt.Sprintf("UPDATE mod SET fname = '%s' WHERE id = %d;", name, id)
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
