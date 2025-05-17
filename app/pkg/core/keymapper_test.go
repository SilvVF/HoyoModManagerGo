package core

import (
	"database/sql"
	"hmm/db"
	"hmm/pkg/core/dbh"
	"hmm/pkg/util"
	"os"
	"path/filepath"
	"testing"
)

// TestHelloName calls greetings.Hello with a name, checking
// for a valid return value.
func TestConfigFileGeneration(t *testing.T) {

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
	dbHelper := dbh.NewDbHelper(queries, dbSql)

	keymapper := NewKeymapper(dbHelper)

	keymapper.Load(25524)
	keymapper.SaveConfig("test")

	keymapper.LoadPrevious("")
}
