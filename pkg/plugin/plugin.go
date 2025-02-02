package plugin

import (
	"context"
	"errors"
	"hmm/pkg/log"
	"hmm/pkg/util"
	"os"
	"path/filepath"
	"slices"
	"strconv"
	"strings"

	lua "github.com/yuin/gopher-lua"
)

const (
	FEATURE_CATEGORY = 1 << 0
	FEATURE_BROWSE   = 1 << 1

	FEATURE_FLAGS_FN = "Feature_flags"
)

var ErrBadFlag = errors.New("expected to receive an unsigned int for feature flags")

type Plugin struct {
	L     *lua.LState
	path  string
	err   chan error
	flags int
	Done  chan struct{}
}

type PluginError struct {
	err    error
	plugin *Plugin
}

type Plugins struct {
	Plugins []*Plugin
	err     chan PluginError
	ctx     context.Context
}

// https://github.com/PeerDB-io/gluabit32/blob/main/bit32.go#L77
func bit32bor(ls *lua.LState) int {
	x := uint32(0)
	for i, top := 1, ls.GetTop(); i <= top; i += 1 {
		x |= uint32(ls.CheckNumber(i))
	}
	ls.Push(lua.LNumber(x))
	return 1
}

func (p *Plugins) Run() {
	for {

		if _, ok := <-p.ctx.Done(); ok {
			break
		}

		perr := <-p.err

		plugin := perr.plugin
		err := perr.err

		log.LogErrorf("plugin: %s, err: %e", plugin.path, err)
	}
}

func IndexPlugins() ([]string, error) {

	pluginDir := util.GetPluginDir()
	os.MkdirAll(pluginDir, os.ModePerm)
	pdh, err := os.Open(pluginDir)

	if err != nil {
		log.LogError(err.Error())
		return []string{}, err
	}
	defer pdh.Close()

	files, err := pdh.Readdirnames(-1)
	if err != nil {
		log.LogError(err.Error())
		return []string{}, err
	}

	files = slices.DeleteFunc(files, func(name string) bool {
		return filepath.Ext(name) != ".lua"
	})

	log.LogDebugf("found %d lua files", len(files))
	log.LogDebug(strings.Join(files, "\n-"))

	return files, err
}

func New(exports map[string]lua.LGFunction, ctx context.Context) *Plugins {

	errCh := make(chan PluginError)
	ps := &Plugins{
		err:     errCh,
		Plugins: []*Plugin{},
	}
	Lopts := lua.Options{}
	Loader := func(L *lua.LState) int {
		exports["bor"] = bit32bor
		module := L.SetFuncs(L.NewTable(), exports)
		L.SetField(module, "FEATURE_CATEGORY", lua.LNumber(FEATURE_CATEGORY))
		L.SetField(module, "FEATURE_BROWSE", lua.LNumber(FEATURE_BROWSE))
		L.Push(module)
		return 1
	}

	files, err := IndexPlugins()

	if err != nil {
		return ps
	}

	for _, file := range files {
		plug := &Plugin{
			L:    lua.NewState(Lopts),
			path: filepath.Join(util.GetPluginDir(), file),
			err:  make(chan error),
			Done: make(chan struct{}),
		}

		ctx, cancel := context.WithCancel(ctx)
		go func() {
			for {
				select {
				case <-plug.Done:
					cancel()
				case err := <-plug.err:
					errCh <- PluginError{plugin: plug, err: err}
				case <-ctx.Done():
					plug.L.Close()
					return
				}
			}
		}()
		plug.L.PreloadModule("pluginmodule", Loader)

		err := plug.L.DoFile(plug.path)
		if err != nil {
			log.LogError("failed to do file" + err.Error())
			plug.Done <- struct{}{}
			continue
		}

		flags, err := getFeatureFlags(plug)
		if err != nil {
			log.LogError("failed to get flags" + err.Error())
			plug.Done <- struct{}{}
			continue
		}

		plug.flags = flags
		ps.Plugins = append(ps.Plugins, plug)
	}

	return ps
}

func getFeatureFlags(p *Plugin) (int, error) {

	L := p.L

	err := L.CallByParam(lua.P{
		Fn:      L.GetGlobal(FEATURE_FLAGS_FN),
		NRet:    1,
		Protect: true,
	})

	if err != nil {
		return 0, err
	}

	ret := L.Get(-1)
	L.Pop(1)

	if ret.Type() != lua.LTNumber {
		return 0, ErrBadFlag
	}

	flags, err := strconv.Atoi(ret.String())
	if err != nil {
		return 0, ErrBadFlag
	}
	return flags, nil
}
