package plugin

import (
	"context"
	"fmt"
	"strconv"
	"testing"

	lua "github.com/yuin/gopher-lua"
)

func TestPlugins(t *testing.T) {

	exports := make(map[string]lua.LGFunction)
	ctx := context.Background()

	plugins := New(exports, ctx)

	for _, plug := range plugins.Plugins {
		fmt.Printf("filepath: %s, flags: %s\n", plug.path, strconv.FormatInt(int64(plug.flags), 2))
	}

	t.Fail()
}
