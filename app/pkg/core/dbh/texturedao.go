package dbh

import (
	"database/sql"
	"hmm/db"
	"hmm/pkg/types"
	"slices"
	"strings"
)

type TextureDao interface {
	InsertTexture(texture types.Texture) (int64, error)
	SelectTexturesByModId(id int) ([]types.Texture, error)
	SelectEnabledTexturesByModId(id int) ([]types.Texture, error)
	SelectTextureById(id int) (types.Texture, error)
	UpdateTextureEnabledById(id int, enabled bool) error
	DeleteUnusedTextureFromMap(modIdtoTexFiles map[int][]string) error
	updateTextureName(id int, name string) error
}

var _ TextureDao = (*DbHelper)(nil)

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

func (h *DbHelper) DeleteUnusedTextureFromMap(modIdtoTexFiles map[int][]string) error {
	return h.withTransaction(func(q *db.Queries) error {
		for modId, files := range modIdtoTexFiles {
			if err := q.DeleteUnusedTextures(h.ctx, db.DeleteUnusedTexturesParams{
				Files: files,
				ModId: int64(modId),
			}); err != nil {
				return err
			}
		}
		return nil
	})
}

func (h *DbHelper) SelectTextureById(id int) (types.Texture, error) {
	t, err := h.queries.SelectTextureById(h.ctx, int64(id))
	if err != nil {
		return types.Texture{}, err
	}
	return textureFromDb(t), nil
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

func (h *DbHelper) updateTextureName(id int, name string) error {
	return h.queries.UpdateTextureNameById(h.ctx, db.UpdateTextureNameByIdParams{
		Fname: name,
		ID:    int64(id),
	})
}

func (h *DbHelper) UpdateTextureEnabledById(id int, enabled bool) error {
	return h.queries.UpdateTextureEnabledById(h.ctx, db.UpdateTextureEnabledByIdParams{
		Selected: enabled,
		ID:       int64(id),
	})
}
