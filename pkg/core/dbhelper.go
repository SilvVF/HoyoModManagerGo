package core

import (
	"context"
	"database/sql"
	"hmm/db"
	"hmm/pkg/types"
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

func (h *DbHelper) UpsertCharacter(c types.Character) error {
	return h.queries.UpsertCharacter(h.ctx, db.UpsertCharacterParams{
		ID:        int64(c.Id),
		Game:      int64(c.Game),
		Name:      c.Name,
		AvatarUrl: c.AvatarUrl,
		Element:   c.Element,
	})
}

func (h *DbHelper) DeleteUnusedMods(fileNames []string, game types.Game) {
	h.queries.DeleteUnusedMods(h.ctx, db.DeleteUnusedModsParams{
		Files: fileNames,
		Game:  int64(game),
	})
}

func (h *DbHelper) InsertMod(m types.Mod) {
	h.queries.InsertMod(h.ctx, db.InsertModParams{
		ID:             int64(m.Id),
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

	result := make([]types.Character, len(characters))

	for _, c := range characters {
		result = append(result, characterFromDb(c))
	}

	return result
}

func (h *DbHelper) SelectClosestCharacter(name string, game types.Game) *types.Character {
	c, err := h.queries.SelectClosestCharacter(h.ctx, db.SelectClosestCharacterParams{
		Name: name,
		Game: int64(game),
	})

	if err != nil {
		return nil
	}

	character := characterFromDb(c)

	return &character
}
