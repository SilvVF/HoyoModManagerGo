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
	global persist $swapvar = 1
	global $ActiveCharacter = 0`

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

; Overrides ---------------------------

[TextureOverrideYelanPosition]
hash = c58c76f9
run = CommandListYelanPosition
$ActiveCharacter = 1

[TextureOverrideYelanBlend]
hash = f6e01e3c
run = CommandListYelanBlend

[TextureOverrideYelanTexcoord]
hash = 428b836c
run = CommandListYelanTexcoord

[TextureOverrideYelanVertexLimitRaise]
hash = 589fed34

[TextureOverrideYelanIB]
hash = 82e14ea2
run = CommandListYelanIB

[TextureOverrideYelanHead]
hash = 82e14ea2
match_first_index = 0
run = CommandListYelanHead

[TextureOverrideYelanBody]
hash = 82e14ea2
match_first_index = 20913
run = CommandListYelanBody

[TextureOverrideYelanDress]
hash = 82e14ea2
match_first_index = 51759
run = CommandListYelanDress

[TextureOverrideYelanExtra]
hash = 82e14ea2
match_first_index = 54042
run = CommandListYelanExtra

[TextureOverrideYelanFaceHeadDiffuse]
hash = d3c0b54a
run = CommandListYelanFaceHeadDiffuse

[TextureOverride41FixVertexLimitRaise0]
hash = d17ac213

; CommandList -------------------------

[CommandListYelanPosition]
if $swapvar == 0
	vb0 = ResourceYelanPosition.0
else if $swapvar == 1
	vb0 = ResourceYelanPosition.1
else if $swapvar == 2
	vb0 = ResourceYelanPosition.2
endif

[CommandListYelanBlend]
if $swapvar == 0
	vb1 = ResourceYelanBlend.0
	handling = skip
	draw = 16261,0
else if $swapvar == 1
	vb1 = ResourceYelanBlend.1
	handling = skip
	draw = 13885,0
else if $swapvar == 2
	vb1 = ResourceYelanBlend.2
	handling = skip
	draw = 9690,0
endif

[CommandListYelanTexcoord]
if $swapvar == 0
	vb1 = ResourceYelanTexcoord.0
else if $swapvar == 1
	vb1 = ResourceYelanTexcoord.1
else if $swapvar == 2
	vb1 = ResourceYelanTexcoord.2
endif

[CommandListYelanIB]
if $swapvar == 0
	handling = skip
	drawindexed = auto
else if $swapvar == 1
	handling = skip
	drawindexed = auto
else if $swapvar == 2
	handling = skip
	drawindexed = auto
endif

[CommandListYelanHead]
if $swapvar == 0
	ib = ResourceYelanHeadIB.0
	ps-t0 = ResourceYelanHeadDiffuse.0
	ps-t1 = ResourceYelanHeadLightMap.0
else if $swapvar == 1
	ib = ResourceYelanHeadIB.1
	ps-t0 = ResourceYelanHeadDiffuse.1
	ps-t1 = ResourceYelanHeadLightMap.1
else if $swapvar == 2
	ib = ResourceYelanHeadIB.2
	ps-t0 = ResourceYelanHeadDiffuse.2
	ps-t1 = ResourceYelanHeadLightMap.2
endif

[CommandListYelanBody]
if $swapvar == 0
	ib = ResourceYelanBodyIB.0
	ps-t0 = ResourceYelanBodyDiffuse.0
	ps-t1 = ResourceYelanBodyLightMap.0
else if $swapvar == 1
	ib = ResourceYelanBodyIB.1
	ps-t0 = ResourceYelanBodyDiffuse.1
	ps-t1 = ResourceYelanBodyLightMap.1
else if $swapvar == 2
	ib = ResourceYelanBodyIB.2
	ps-t0 = ResourceYelanBodyDiffuse.2
	ps-t1 = ResourceYelanBodyLightMap.2
endif

[CommandListYelanDress]
if $swapvar == 0
	ib = ResourceYelanDressIB.0
	ps-t0 = ResourceYelanDressDiffuse.0
	ps-t1 = ResourceYelanDressLightMap.0
else if $swapvar == 1
	ib = ResourceYelanDressIB.1
	ps-t0 = ResourceYelanDressDiffuse.1
	ps-t1 = ResourceYelanDressLightMap.1
else if $swapvar == 2
	ib = ResourceYelanDressIB.2
	ps-t0 = ResourceYelanDressDiffuse.2
	ps-t1 = ResourceYelanDressLightMap.2
endif

[CommandListYelanExtra]
if $swapvar == 0
	ib = ResourceYelanExtraIB.0
	ps-t0 = ResourceYelanExtraDiffuse.0
	ps-t1 = ResourceYelanExtraLightMap.0
else if $swapvar == 1
	ib = ResourceYelanExtraIB.1
	ps-t0 = ResourceYelanExtraDiffuse.1
	ps-t1 = ResourceYelanExtraLightMap.1
else if $swapvar == 2
	ib = ResourceYelanExtraIB.2
	ps-t0 = ResourceYelanExtraDiffuse.2
	ps-t1 = ResourceYelanExtraLightMap.2
endif

[CommandListYelanFaceHeadDiffuse]
if $swapvar == 0
	ps-t0 = ResourceYelanFaceHeadDiffuse.0
else if $swapvar == 1
	ps-t0 = ResourceYelanFaceHeadDiffuse.1
else if $swapvar == 2
	ps-t0 = ResourceYelanFaceHeadDiffuse.2
endif

; Resources ---------------------------

[ResourceYelanPosition.0]
type = Buffer
stride = 40
filename = .\0- Normal\YelanPosition.buf

[ResourceYelanBlend.0]
type = Buffer
stride = 32
filename = .\0- Normal\YelanBlend.buf

[ResourceYelanTexcoord.0]
type = Buffer
stride = 20
filename = .\0- Normal\YelanTexcoord.buf

[ResourceYelanHeadIB.0]
type = Buffer
format = DXGI_FORMAT_R32_UINT
filename = .\0- Normal\YelanHead.ib

[ResourceYelanBodyIB.0]
type = Buffer
format = DXGI_FORMAT_R32_UINT
filename = .\0- Normal\YelanBody.ib

[ResourceYelanDressIB.0]
type = Buffer
format = DXGI_FORMAT_R32_UINT
filename = .\0- Normal\YelanDress.ib

[ResourceYelanExtraIB.0]
type = Buffer
format = DXGI_FORMAT_R32_UINT
filename = .\0- Normal\YelanExtra.ib

[ResourceYelanHeadDiffuse.0]
filename = .\0- Normal\YelanHeadDiffuse.dds

[ResourceYelanHeadLightMap.0]
filename = .\0- Normal\YelanHeadLightMap.dds

[ResourceYelanBodyDiffuse.0]
filename = .\0- Normal\YelanBodyDiffuse.dds

[ResourceYelanBodyLightMap.0]
filename = .\0- Normal\YelanBodyLightMap.dds

[ResourceYelanDressDiffuse.0]
filename = .\0- Normal\YelanDressDiffuse.dds

[ResourceYelanDressLightMap.0]
filename = .\0- Normal\YelanDressLightMap.dds

[ResourceYelanExtraDiffuse.0]
filename = .\0- Normal\YelanExtraDiffuse.dds

[ResourceYelanExtraLightMap.0]
filename = .\0- Normal\YelanExtraLightMap.dds

[ResourceYelanFaceHeadDiffuse.0]
filename = .\0- Normal\YelanFaceHeadDiffuse.dds

[ResourceYelanPosition.1]
type = Buffer
stride = 40
filename = .\1- PantsuCoat\YelanPosition.buf

[ResourceYelanBlend.1]
type = Buffer
stride = 32
filename = .\1- PantsuCoat\YelanBlend.buf

[ResourceYelanTexcoord.1]
type = Buffer
stride = 20
filename = .\1- PantsuCoat\YelanTexcoord.buf

[ResourceYelanHeadIB.1]
type = Buffer
format = DXGI_FORMAT_R32_UINT
filename = .\1- PantsuCoat\YelanHead.ib

[ResourceYelanBodyIB.1]
type = Buffer
format = DXGI_FORMAT_R32_UINT
filename = .\1- PantsuCoat\YelanBody.ib

[ResourceYelanDressIB.1]
type = Buffer
format = DXGI_FORMAT_R32_UINT
filename = .\1- PantsuCoat\YelanDress.ib

[ResourceYelanExtraIB.1]
type = Buffer
format = DXGI_FORMAT_R32_UINT
filename = .\1- PantsuCoat\YelanExtra.ib

[ResourceYelanHeadDiffuse.1]
filename = .\0- Normal\YelanHeadDiffuse.dds

[ResourceYelanHeadLightMap.1]
filename = .\0- Normal\YelanHeadLightMap.dds

[ResourceYelanBodyDiffuse.1]
filename = .\1- PantsuCoat\YelanBodyDiffuse.dds

[ResourceYelanBodyLightMap.1]
filename = .\1- PantsuCoat\YelanBodyLightMap.dds

[ResourceYelanDressDiffuse.1]
filename = .\0- Normal\YelanDressDiffuse.dds

[ResourceYelanDressLightMap.1]
filename = .\0- Normal\YelanDressLightMap.dds

[ResourceYelanExtraDiffuse.1]
filename = .\0- Normal\YelanExtraDiffuse.dds

[ResourceYelanExtraLightMap.1]
filename = .\0- Normal\YelanExtraLightMap.dds

[ResourceYelanFaceHeadDiffuse.1]
filename = .\0- Normal\YelanFaceHeadDiffuse.dds

[ResourceYelanPosition.2]
type = Buffer
stride = 40
filename = .\2- Pantsu\YelanPosition.buf

[ResourceYelanBlend.2]
type = Buffer
stride = 32
filename = .\2- Pantsu\YelanBlend.buf

[ResourceYelanTexcoord.2]
type = Buffer
stride = 20
filename = .\2- Pantsu\YelanTexcoord.buf

[ResourceYelanHeadIB.2]
type = Buffer
format = DXGI_FORMAT_R32_UINT
filename = .\2- Pantsu\YelanHead.ib

[ResourceYelanBodyIB.2]
type = Buffer
format = DXGI_FORMAT_R32_UINT
filename = .\2- Pantsu\YelanBody.ib

[ResourceYelanDressIB.2]
type = Buffer
format = DXGI_FORMAT_R32_UINT
filename = .\2- Pantsu\YelanDress.ib

[ResourceYelanExtraIB.2]
type = Buffer
format = DXGI_FORMAT_R32_UINT
filename = .\2- Pantsu\YelanExtra.ib

[ResourceYelanHeadDiffuse.2]
filename = .\0- Normal\YelanHeadDiffuse.dds

[ResourceYelanHeadLightMap.2]
filename = .\0- Normal\YelanHeadLightMap.dds

[ResourceYelanBodyDiffuse.2]
filename = .\1- PantsuCoat\YelanBodyDiffuse.dds

[ResourceYelanBodyLightMap.2]
filename = .\1- PantsuCoat\YelanBodyLightMap.dds

[ResourceYelanDressDiffuse.2]
filename = .\0- Normal\YelanDressDiffuse.dds

[ResourceYelanDressLightMap.2]
filename = .\0- Normal\YelanDressLightMap.dds

[ResourceYelanExtraDiffuse.2]
filename = .\0- Normal\YelanExtraDiffuse.dds

[ResourceYelanExtraLightMap.2]
filename = .\0- Normal\YelanExtraLightMap.dds

[ResourceYelanFaceHeadDiffuse.2]
filename = .\0- Normal\YelanFaceHeadDiffuse.dds



; .ini generated by GIMI (Genshin-Impact-Model-Importer) mod merger script
; If you have any issues or find any bugs, please open a ticket at https://github.com/SilentNightSound/GI-Model-Importer/issues or contact SilentNightSound#7430 on discord`

	i, _ := ini.Load([]byte(testIni))

	f, _ := os.CreateTemp(os.TempDir(), "")
	defer os.RemoveAll(f.Name()) // Ensure cleanup

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
	}

	t.Fail()
}
