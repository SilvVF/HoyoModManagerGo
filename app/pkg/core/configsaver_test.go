package core

import (
	"context"
	"database/sql"
	"hmm/db"
	"hmm/pkg/core/dbh"
	"hmm/pkg/pref"
	"hmm/pkg/types"
	"hmm/pkg/util"
	"os"
	"path/filepath"
	"testing"

	"gopkg.in/ini.v1"
)

const (
	genshinDir  = "C:\\Users\\david\\SkinMods\\GIMI\\Mods"
	starRailDir = "C:\\Users\\david\\SkinMods\\SRMI\\Mods"
	zzzDir      = "C:\\Users\\david\\SkinMods\\ZZMI\\Mods"
	wuwaDir     = "C:\\Users\\david\\SkinMods\\WWMI\\Mods"
	rootModDir  = "E:\\modmanager"
)

func TestWriteOriIni(t *testing.T) {
	testIni := `
	[Constants]
	swapvar = 1
	ActiveCharacter = 0`

	fullIni := `
	; Merged Mod: .\0- Normal\Yelan.ini, .\1- PantsuCoat\_Yelan.ini, .\2- Pantsu\_Yelan.ini

; Constants ---------------------------

[Constants]
global persist $swapvar = 0
global $ActiveCharacter = 0

[KeySwap]
condition = $ActiveCharacter == 1
key = p
type = cycle
$swapvar = 0,1,2

[Present]
post $ActiveCharacter = 0
`
	i, _ := ini.Load([]byte(testIni))

	f, _ := os.CreateTemp(os.TempDir(), "")
	defer os.RemoveAll(f.Name())

	_, err := f.WriteString(fullIni)
	if err != nil {
		t.Error("Failed to write to temp file:", err)
	}

	f.Sync()
	f.Close()

	f, err = os.Open(f.Name())
	if err != nil {
		t.Error("Failed to reopen temp file:", err)
	}

	c, err := OverwriteIniFiles(f, i)
	f.Close()

	if err != nil {
		t.Error(err)
	}

	t.Log("size of content: ", len(c))
	t.Log(c)

	t.Fail()
}

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
	dbHelper := dbh.NewDbHelper(queries, dbSql)

	dirs := map[types.Game]string{
		types.Genshin:  genshinDir,
		types.StarRail: starRailDir,
		types.ZZZ:      zzzDir,
		types.WuWa:     wuwaDir,
	}

	dirPrefs := map[types.Game]pref.Preference[string]{
		types.Genshin:  prefs.GetString("genshin_dir", ""),
		types.StarRail: prefs.GetString("sr_dir", ""),
		types.ZZZ:      prefs.GetString("zzz_dir", "C:\\Users\\david\\SkinMods\\ZZMI\\Mods"),
		types.WuWa:     prefs.GetString("wuwu_dir", ""),
	}

	configSaver := NewConfigSaver(dirPrefs, dbHelper)

	for _, game := range []types.Game{types.ZZZ} {

		dirPrefs[game].Set(dirs[game])

		files, err := configSaver.saveConfig(game)
		if err != nil {
			t.Error(err)
		}
		t.Log(files)

		mod := files[0]

		conf, err := GetEnabledConfig(mod)
		if err != nil {
			t.Error(err)
		}
		t.Log(mod.Character)
		sec := conf.Section("Constants")
		for _, k := range sec.Keys() {
			t.Log(k.Name() + " = " + k.Value())
		}

		f, err := os.Open("C:\\Users\\david\\dev\\go\\skin-mod-manager\\app\\test_resources\\Qingyi.ini")
		if err != nil {
			t.Error(err)
		}
		defer f.Close()

		ini, err := OverwriteIniFiles(f, conf)
		if err != nil {
			t.Error(err)
		}
		t.Log(ini)
	}

	t.Fail()
}
