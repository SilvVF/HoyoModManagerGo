package dbh

import (
	"database/sql"
	"hmm/db"
	"hmm/pkg/types"
	"slices"
	"strings"
)

type ModDao interface {
	InsertMod(mod types.Mod) (int64, error)
	SelectModsByCharacterName(name string, game types.Game) ([]types.Mod, error)
	SelectModById(id int) (types.Mod, error)
	SelectEnabledModsByGame(game types.Game) ([]types.Mod, error)
	SelectModByFileCharacterGame(file, character string, game types.Game) (types.Mod, error)
	SelectModsByGbId(id int) ([]types.Mod, error)
	DeleteUnusedMods(files []string, game types.Game) error
	UpdateModGbId(modId, gbId int) error
	UpdateModImages(id int, images []string) error
	UpdateDisableAllModsByGame(game types.Game) error
	UpdateModEnabledById(enabled bool, id int) error
	UpdateModsEnabledFromSlice(ids []int64, game types.Game) error
}

var _ ModDao = (*DbHelper)(nil)

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

func (h *DbHelper) SelectModById(id int) (types.Mod, error) {
	dbMod, err := h.queries.SelectModById(h.ctx, int64(id))
	if err != nil {
		return types.Mod{}, err
	}
	return modFromDb(dbMod), nil
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

func (h *DbHelper) SelectModByFileCharacterGame(fname, c string, g types.Game) (types.Mod, error) {
	m, err := h.queries.SelectModByFileCharacterGame(h.ctx, db.SelectModByFileCharacterGameParams{
		Fname:         fname,
		Game:          g.Int64(),
		CharacterName: c,
	})
	if err != nil {
		return types.Mod{}, err
	}
	return modFromDb(m), nil
}

func (h *DbHelper) SelectModsByGbId(id int) ([]types.Mod, error) {
	mods, err := h.queries.SelectModsByGbId(h.ctx, sql.NullInt64{
		Valid: true,
		Int64: int64(id),
	})
	if err != nil {
		return make([]types.Mod, 0), err
	}

	result := make([]types.Mod, 0, len(mods))

	for _, m := range mods {
		result = append(result, modFromDb(m))
	}

	return result, nil
}

func (h *DbHelper) DeleteUnusedMods(files []string, game types.Game) error {

	if len(files) == 0 {
		BackupDatabase()
	}

	return h.queries.DeleteUnusedMods(h.ctx, db.DeleteUnusedModsParams{
		Files: files,
		Game:  game.Int64(),
	})
}

func (h *DbHelper) UpdateModGbId(modId, gbId int) error {
	return h.queries.UpdateModGbId(h.ctx, db.UpdateModGbIdParams{
		GbId: sql.NullInt64{Valid: gbId > 0, Int64: int64(modId)},
		ID:   int64(gbId),
	})
}

func (h *DbHelper) UpdateModImages(modId int, images []string) error {
	return h.queries.UpdateModImages(h.ctx, db.UpdateModImagesParams{
		PreviewImages: strings.Join(images, "<seperator>"),
		ID:            int64(modId),
	})
}

func (h *DbHelper) UpdateDisableAllModsByGame(game types.Game) error {
	return h.queries.UpdateDisableAllModsByGame(h.ctx, game.Int64())
}

func (h *DbHelper) UpdateModEnabledById(enabled bool, id int) error {
	return h.queries.UpdateModEnabledById(h.ctx, db.UpdateModEnabledByIdParams{
		Selected: enabled,
		ID:       int64(id),
	})
}

func (h *DbHelper) UpdateModsEnabledFromSlice(ids []int64, game types.Game) error {
	return h.queries.UpdateModsEnabledFromSlice(h.ctx, db.UpdateModsEnabledFromSliceParams{
		Enabled: ids,
		Game:    game.Int64(),
	})
}
