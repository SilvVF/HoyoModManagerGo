package dbh

import (
	"hmm/db"
)

type IniCacheEntry struct {
	Id    int
	ModId int
	File  string
}

type IniCache interface {
	SelectIniEntryByModId(id int) (IniCacheEntry, error)
	InsertIniEntry(modId int, file string) error
}

var _ IniCache = (*DbHelper)(nil)

func (h *DbHelper) SelectIniEntryByModId(id int) (IniCacheEntry, error) {

	dbEntry, err := h.queries.SelectIniCacheByModId(h.ctx, int64(id))
	if err != nil {
		return IniCacheEntry{}, err
	}
	return IniCacheEntry{
		Id:    int(dbEntry.ID),
		ModId: int(dbEntry.ModID),
		File:  dbEntry.Fname,
	}, nil
}

func (h *DbHelper) InsertIniEntry(modId int, file string) error {
	return h.queries.InsertOrUpdateEntry(h.ctx, db.InsertOrUpdateEntryParams{
		ModId: int64(modId),
		FName: file,
	})
}
