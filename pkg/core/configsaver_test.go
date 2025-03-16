package core

import (
	"context"
	"hmm/pkg/pref"
	"hmm/pkg/types"
	"testing"
)

const genshinDir = "C:\\Users\\david\\SkinMods\\GIMI\\Mods"
const starRailDir = "C:\\Users\\david\\SkinMods\\SRMI\\Mods"
const zzzDir = "C:\\Users\\david\\SkinMods\\ZZMI\\Mods"
const wuwaDir = "C:\\Users\\david\\SkinMods\\WWMI\\Mods"

func TestReadConfig(t *testing.T) {

	ctx := context.Background()
	store := pref.NewInMemoryStore(ctx)
	prefs := pref.NewPrefs(store)

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

	configSaver := NewConfigSaver(dirPrefs)

	for _, game := range types.Games {

		dirPrefs[game].Set(dirs[game])

		conf, err := configSaver.saveConfig(game, "")
		if err != nil {
			t.Error(err)
		}
		t.Logf("%v", conf)
		t.Log("\n\n\n========================================")
	}
	t.Fail()
}
