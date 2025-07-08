package dbh

import (
	"hmm/db"
	"hmm/pkg/types"
)

type TagDao interface {
	InsertTag(name string, modId int) error
	UpdateTagName(old, new string, modId int) error
	DeleteTag(name string, modId int) error
	SelectTagsByModId(modId int64) ([]types.Tag, error)
	InsertTagForAllModsByCharacterIds(ids []int64, tagname string, game types.Game) error
}

var _ TagDao = (*DbHelper)(nil)

func (h *DbHelper) InsertTag(name string, modId int) error {
	return h.queries.InsertTag(h.ctx, db.InsertTagParams{
		TagName: name,
		ModId:   int64(modId),
	})
}

func (h *DbHelper) DeleteTag(name string, modId int) error {
	return h.queries.DeleteTag(h.ctx, db.DeleteTagParams{
		Name:  name,
		ModId: int64(modId),
	})
}

func (h *DbHelper) SelectTagsByModId(modId int64) ([]types.Tag, error) {
	dbTags, err := h.queries.SelectTagsByModId(h.ctx, modId)
	if err != nil {
		return make([]types.Tag, 0), err
	}
	tags := make([]types.Tag, len(dbTags))

	for i, dbTag := range dbTags {
		tags[i] = types.Tag{
			ModId: int(dbTag.ModID),
			Name:  dbTag.TagName,
		}
	}

	return tags, err
}

func (h *DbHelper) UpdateTagName(old, new string, modId int) error {
	return h.queries.UpdateTagName(h.ctx, db.UpdateTagNameParams{
		UpdatedName: new,
		ID:          int64(modId),
		OldName:     old,
	})
}

func (h *DbHelper) InsertTagForAllModsByCharacterIds(ids []int64, tagname string, game types.Game) error {
	return h.withTransaction(func(q *db.Queries) error {
		for _, cid := range ids {
			mods, err := q.SelectModsByCharacterId(h.ctx, db.SelectModsByCharacterIdParams{
				Name: cid,
				Game: game.Int64(),
			})
			if err != nil {
				return err
			}
			for _, m := range mods {
				err := q.InsertTag(h.ctx, db.InsertTagParams{
					TagName: tagname,
					ModId:   m.ID,
				})
				if err != nil {
					return err
				}
			}
		}
		return nil
	})
}
