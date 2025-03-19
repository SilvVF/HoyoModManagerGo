package core

import (
	"context"
	"database/sql"
	"hmm/db"
	"hmm/pkg/pref"
	"hmm/pkg/util"
	"os"
	"path/filepath"
	"testing"
)

// TestHelloName calls greetings.Hello with a name, checking
// for a valid return value.
func TestConfigFileGeneration(t *testing.T) {
	ctx := context.Background()
	store := pref.NewInMemoryStore(ctx)
	prefs := pref.NewPrefs(store)

	dbfile := util.GetDbFile()
	os.MkdirAll(filepath.Dir(dbfile), os.ModePerm)

	util.CreateFileIfNotExists(dbfile)
	util.SetRootModDirFn(func() string {
		return rootModDir
	})

	dbSql, err := sql.Open("sqlite3", dbfile)
	if err != nil {
		panic(err)
	}

	queries := db.New(dbSql)
	dbHelper := NewDbHelper(queries, dbSql)

	keymapper := NewKeymapper(dbHelper)

	keymapper.Load(25524)
	keymapper.SaveConfig("test")

	keymapper.LoadPrevious("")
}
