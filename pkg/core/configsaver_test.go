package core

import (
	"context"
	"database/sql"
	"hmm/db"
	"hmm/pkg/pref"
	"hmm/pkg/types"
	"hmm/pkg/util"
	"os"
	"path/filepath"
	"testing"
)

const (
	genshinDir  = "C:\\Users\\david\\SkinMods\\GIMI\\Mods"
	starRailDir = "C:\\Users\\david\\SkinMods\\SRMI\\Mods"
	zzzDir      = "C:\\Users\\david\\SkinMods\\ZZMI\\Mods"
	wuwaDir     = "C:\\Users\\david\\SkinMods\\WWMI\\Mods"
	rootModDir  = "E:\\modmanager"
)

func TestReadConfig(t *testing.T) {

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

	dirs := map[types.Game]string{
		types.Genshin:  genshinDir,
		types.StarRail: starRailDir,
		types.ZZZ:      zzzDir,
		types.WuWa:     wuwaDir,
	}

	dirPrefs := map[types.Game]pref.Preference[string]{
		types.Genshin:  prefs.GetString("genshin_dir", ""),
		types.StarRail: prefs.GetString("sr_dir", ""),
		types.ZZZ:      prefs.GetString("zzz_dir", ""),
		types.WuWa:     prefs.GetString("wuwu_dir", ""),
	}

	configSaver := NewConfigSaver(dirPrefs, dbHelper)

	for _, game := range types.Games {

		dirPrefs[game].Set(dirs[game])

		files, err := configSaver.saveConfig(game)
		if err != nil {
			t.Error(err)
		}

		t.Log(files)
		t.Log("\n========================================")
		break
	}
	t.Fail()
}
