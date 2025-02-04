package plugin

import (
	"context"
	"errors"
	"hmm/pkg/log"
	"hmm/pkg/util"
	"os"
	"path/filepath"
	"slices"
	"strings"

	lua "github.com/yuin/gopher-lua"
)

const (
	FEATURE_TAB_APP      = 1 << 0
	FEATURE_TAB_DISCOVER = 1 << 1
	FEATURE_TAB_LIBRARY  = 1 << 2

	EVENT_IDLE    = 0
	EVENT_STARTED = 1
	EVENT_ERROR   = 2
	EVENT_STOPPED = 3
	EVENT_FAILED  = 4
	EVENT_INFO    = 5

	FEATURE_FLAGS_FN = "Feature_flags"
)

var ErrBadFlag = errors.New("expected to receive an unsigned int for feature flags")

type Plugin struct {
	L         *lua.LState
	Path      string
	lastEvent PluginEvent
	eventCh   chan PluginEvent
	flags     int
	Done      chan struct{}
}

type PluginEvent struct {
	Etype  int
	Data   interface{}
	Plugin *Plugin
}

type Plugins struct {
	Plugins  []*Plugin
	event    chan PluginEvent
	ctx      context.Context
	cancel   context.CancelFunc
	moduleFn func(L *lua.LState) *lua.LTable
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

func (p *Plugins) Stop() {
	p.cancel()
	<-p.ctx.Done()
}

func (p *Plugins) Run(onEvent func(pe PluginEvent)) {
	for {
		select {
		case <-p.ctx.Done():
			return
		case pe := <-p.event:
			onEvent(pe)
			log.LogDebugf("plugin: %s, event: %d, data: %v", pe.Plugin.Path, pe.Etype, pe.Data)
		}
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

	pluginsCtx, cancel := context.WithCancel(ctx)
	eventCh := make(chan PluginEvent)
	ps := &Plugins{
		event:   eventCh,
		Plugins: []*Plugin{},
		ctx:     pluginsCtx,
		cancel:  cancel,
	}
	Lopts := lua.Options{}
	ps.moduleFn = func(L *lua.LState) *lua.LTable {
		exports["bor"] = bit32bor
		module := L.SetFuncs(L.NewTable(), exports)
		L.SetField(module, "FEATURE_TAB_APP", lua.LNumber(FEATURE_TAB_APP))
		L.SetField(module, "FEATURE_TAB_DISCOVER", lua.LNumber(FEATURE_TAB_DISCOVER))
		L.SetField(module, "FEATURE_TAB_LIBRARY", lua.LNumber(FEATURE_TAB_LIBRARY))

		return module
	}

	files, err := IndexPlugins()

	if err != nil {
		return ps
	}

	for _, file := range files {
		plug := &Plugin{
			L:         lua.NewState(Lopts),
			Path:      filepath.Join(util.GetPluginDir(), file),
			lastEvent: PluginEvent{Etype: EVENT_IDLE, Plugin: nil},
			Done:      make(chan struct{}),
		}
		ps.Plugins = append(ps.Plugins, plug)
	}

	return ps
}

func (p *Plugins) StartAllPlugins() {
	for _, plug := range p.Plugins {
		go plug.Run(p.ctx, p.moduleFn(plug.L))
	}
}

func (p *Plugins) StartPlugin(plug *Plugin) {
	go plug.Run(p.ctx, p.moduleFn(plug.L))
}

func (p *Plugin) sendEvent(etype int, data ...interface{}) {
	pe := PluginEvent{Etype: etype, Data: data, Plugin: p}
	p.lastEvent = pe
	p.eventCh <- pe
}

func (p *Plugin) Reset() {

	if _, ok := <-p.Done; ok {
		return
	}

	p.L = lua.NewState(p.L.Options)
	p.lastEvent = PluginEvent{Etype: EVENT_IDLE}
	p.Done = make(chan struct{})
	p.flags = 0
}

func (p *Plugin) Run(ctx context.Context, Module *lua.LTable) {

	p.Reset()

	cctx, cancel := context.WithCancel(ctx)
	defer func() {
		close(p.Done)
		cancel()
		p.L.Close()
		p.sendEvent(EVENT_STOPPED)
	}()

	p.L.PreloadModule("pluginmodule", func(l *lua.LState) int {
		p.L.SetFuncs(Module, map[string]lua.LGFunction{
			"emit_error": func(ls *lua.LState) int {
				p.sendEvent(EVENT_ERROR, errors.New(ls.CheckString(-1)))
				ls.Pop(1)
				return 1
			},
			"emit_info": func(ls *lua.LState) int {
				p.sendEvent(EVENT_INFO, ls.CheckString(-1))
				ls.Pop(1)
				return 1
			},
		})
		p.L.Push(Module)
		return 1
	})

	err := p.L.DoFile(p.Path)
	if err != nil {
		p.sendEvent(EVENT_FAILED, err)
		log.LogError("failed to do file" + err.Error())
		return
	}

	flags, err := getFeatureFlags(p)
	if err != nil {
		p.sendEvent(EVENT_FAILED, err)
		log.LogError("failed to get flags" + err.Error())
		return
	}
	p.flags = flags
	p.sendEvent(EVENT_STARTED)

	for {
		select {
		case <-p.Done:
			cancel()
		case <-cctx.Done():
			return
		}
	}
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

	v := L.Get(-1)
	L.Pop(1)

	if lv, ok := v.(lua.LNumber); !ok {
		return 0, ErrBadFlag
	} else {
		return int(lv), nil
	}
}
