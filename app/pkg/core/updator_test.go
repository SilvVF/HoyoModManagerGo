package core

import (
	"context"
	"hmm/pkg/api"
	"hmm/pkg/pref"
	"hmm/pkg/types"
	"testing"
)

func TestUpdator(t *testing.T) {

	ctx := context.Background()
	prefs := pref.NewPrefs(pref.NewInMemoryStore(ctx))

	dirs := map[types.Game]pref.Preference[string]{
		types.Genshin:  prefs.GetString("genshin", ""),
		types.StarRail: prefs.GetString("starrail", ""),
		types.ZZZ:      prefs.GetString("zzz", ""),
		types.WuWa:     prefs.GetString("wuwa", ""),
	}
	api := &api.GbApi{}

	updator := NewUpdator(api, dirs)

	updates := updator.CheckFixesForUpdate()

	t.Log(updates)

	t.Fail()
}
