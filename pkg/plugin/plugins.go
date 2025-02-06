package plugin

import (
	"context"
	"hmm/pkg/log"
	"hmm/pkg/pref"
	"hmm/pkg/util"
	"os"
	"path/filepath"
	"slices"
	"strings"
	"sync"

	lua "github.com/yuin/gopher-lua"
)

type Plugins struct {
	Plugins  map[string]*Plugin
	enabled  pref.Preference[[]string]
	mutex    sync.RWMutex
	event    chan PluginEvent
	ctx      context.Context
	cancel   context.CancelFunc
	moduleFn func(L *lua.LState) *lua.LTable
	lopts    lua.Options
}

func New(
	exports map[string]lua.LGFunction,
	ctx context.Context,
	enabled pref.Preference[[]string],
) *Plugins {

	pluginsCtx, cancel := context.WithCancel(ctx)
	eventCh := make(chan PluginEvent)

	return &Plugins{
		event:   eventCh,
		enabled: enabled,
		Plugins: make(map[string]*Plugin),
		ctx:     pluginsCtx,
		cancel:  cancel,
		moduleFn: func(L *lua.LState) *lua.LTable {
			exports["bor"] = bit32bor
			module := L.SetFuncs(L.NewTable(), exports)
			L.SetField(module, "FEATURE_TAB_APP", lua.LNumber(FEATURE_TAB_APP))
			L.SetField(module, "FEATURE_TAB_DISCOVER", lua.LNumber(FEATURE_TAB_DISCOVER))
			L.SetField(module, "FEATURE_TAB_LIBRARY", lua.LNumber(FEATURE_TAB_LIBRARY))

			return module
		},
		lopts: lua.Options{},
		mutex: sync.RWMutex{},
	}
}

func (p *Plugins) LoadPlugins() error {

	files, err := indexPlugins()

	if err != nil {
		return err
	}

	p.mutex.Lock()
	defer p.mutex.Unlock()

	for _, file := range files {
		path := filepath.Join(util.GetPluginDir(), file)

		if _, ok := p.Plugins[path]; ok {
			continue
		}

		p.Plugins[path] = &Plugin{
			L:         lua.NewState(p.lopts),
			eventCh:   p.event,
			Path:      path,
			lastEvent: PluginEvent{Etype: EVENT_IDLE, Path: path},
			Done:      make(chan struct{}),
			incEvent:  make(chan int),
		}
	}

	return nil
}

func indexPlugins() ([]string, error) {

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

func (p *Plugins) StartAllPlugins(enabled []string) {

	p.mutex.RLock()
	defer p.mutex.RUnlock()
	log.LogDebugf("STARTING enabled: %s", strings.Join(enabled, ", "))
	for _, plug := range p.Plugins {
		if !slices.Contains(enabled, filepath.Base(plug.Path)) {
			log.LogDebugf("plugin: %s not enabled, base: %s", plug.Path, filepath.Base(plug.Path))
			continue
		}

		log.LogDebugf("STARTING plugin: %s", plug.Path)
		go plug.Run(p.ctx, p.moduleFn(plug.L))
	}
}

func (p *Plugins) Stop() {
	p.cancel()
	<-p.ctx.Done()
}

func (p *Plugins) GetState() []struct {
	LastEvent PluginEvent
	Flags     int
} {
	p.mutex.RLock()
	defer p.mutex.RUnlock()

	state := make([]struct {
		LastEvent PluginEvent
		Flags     int
	}, len(p.Plugins))

	i := 0
	for _, plug := range p.Plugins {
		state[i] = struct {
			LastEvent PluginEvent
			Flags     int
		}{
			LastEvent: plug.LastEvent(),
			Flags:     plug.flags,
		}
		i += 1
	}

	return state
}

func (p *Plugins) Broadcast(event int) {
	p.mutex.RLock()
	defer p.mutex.RUnlock()

	for _, plug := range p.Plugins {
		plug.incEvent <- event
	}
}

func (p *Plugins) Run(onEvent func(pe PluginEvent)) {
	watcher, cancel := p.enabled.Watch()
	for {
		select {
		case enabled := <-watcher:
			p.StartAllPlugins(enabled)
		case <-p.ctx.Done():
			cancel()
			return
		case pe := <-p.event:
			onEvent(pe)
			log.LogDebugf("plugin: %s, event: %d, data: %v", pe.Path, pe.Etype, pe.Data)
		}
	}
}
