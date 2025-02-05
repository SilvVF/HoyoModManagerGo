package plugin

import (
	"context"
	"fmt"
	"hmm/pkg/log"
	"hmm/pkg/pref"
	"strconv"
	"sync"
	"testing"

	lua "github.com/yuin/gopher-lua"
)

func TestPlugins(t *testing.T) {

	exports := map[string]lua.LGFunction{}
	ctx := context.Background()
	prefs := pref.NewPrefs(pref.NewInMemoryStore(ctx))
	enabled := prefs.GetStringSlice("test_pref", []string{"plugin1.lua"})

	plugins := New(exports, ctx, enabled)
	wg := sync.WaitGroup{}
	wg.Add(len(plugins.Plugins))

	go plugins.Run(func(pe PluginEvent) {
		log.LogDebugf("Path: %s, event: %d", pe.Path, pe.Etype)
		if pe.Etype == EVENT_STARTED || pe.Etype == EVENT_FAILED {
			wg.Done()
		}
	})

	plugins.StartAllPlugins(enabled.Get())

	wg.Wait()

	for _, plug := range plugins.Plugins {
		fmt.Printf("filepath: %s, flags: %s\n", plug.Path, strconv.FormatInt(int64(plug.flags), 2))
	}

	t.Fail()
}
