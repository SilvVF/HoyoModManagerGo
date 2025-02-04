package plugin

import (
	"context"
	"fmt"
	"strconv"
	"sync"
	"testing"

	lua "github.com/yuin/gopher-lua"
)

func TestPlugins(t *testing.T) {

	exports := make(map[string]lua.LGFunction)
	ctx := context.Background()

	plugins := New(exports, ctx)
	wg := sync.WaitGroup{}
	wg.Add(len(plugins.Plugins))

	go plugins.Run(func(pe PluginEvent) {
		if pe.Etype == EVENT_STARTED || pe.Etype == EVENT_FAILED {
			wg.Done()
		}
	})
	plugins.StartAllPlugins()

	wg.Wait()

	for _, plug := range plugins.Plugins {
		fmt.Printf("filepath: %s, flags: %s\n", plug.Path, strconv.FormatInt(int64(plug.flags), 2))
	}

	t.Fail()
}
