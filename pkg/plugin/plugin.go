package plugin

import (
	"context"
	"errors"
	"hmm/pkg/log"
	"sync"

	lua "github.com/yuin/gopher-lua"
)

const (
	FEATURE_TAB_APP      = 1 << 0
	FEATURE_TAB_DISCOVER = 1 << 1
	FEATURE_TAB_LIBRARY  = 1 << 2

	FEATURE_API_GAME = 1 << 3

	EVENT_IDLE    = 0
	EVENT_STARTED = 1
	EVENT_ERROR   = 2
	EVENT_STOPPED = 3
	EVENT_FAILED  = 4
	EVENT_INFO    = 5

	FEATURE_FLAGS_FN = "Feature_flags"

	CHARACTERS_LIST_FN = "Character_list"
	FILTERS_LIST_FN    = "Filters_list"
)

// type DataApi interface {
// 	SkinId() int
// 	GetGame() types.Game
// 	Elements() []string
// 	Characters() []types.Character
// }

var ErrBadFlag = errors.New("expected to receive an unsigned int for feature flags")

type Plugin struct {
	L         *lua.LState
	Path      string
	lastEvent PluginEvent
	eventCh   chan<- PluginEvent
	flags     int
	incEvent  chan int
	mutex     sync.Mutex
	Done      chan struct{}
}

type PluginEvent struct {
	Etype int
	Path  string
	Data  interface{}
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

func (p *Plugin) LastEvent() PluginEvent {
	p.mutex.Lock()
	defer p.mutex.Unlock()

	return p.lastEvent
}

func (p *Plugin) sendEvent(etype int, data ...interface{}) {

	p.mutex.Lock()
	defer p.mutex.Unlock()

	log.LogDebugf("Sending event %d", etype)

	pe := PluginEvent{Etype: etype, Data: data, Path: p.Path}
	p.lastEvent = pe
	p.eventCh <- pe
}

func (p *Plugin) Reset() {
	p.mutex.Lock()
	defer p.mutex.Unlock()

	select {
	case _, ok := <-p.Done:
		if ok {
			log.LogDebug("Plugin Doesn't need to be reset")
			return
		}
	default:
		log.LogDebug("Plugin Doesn't need to be reset")
		return
	}

	log.LogDebug("Plugin reseting")
	p.L = lua.NewState(p.L.Options)
	p.lastEvent = PluginEvent{Etype: EVENT_IDLE}
	p.Done = make(chan struct{})
	p.flags = 0
}

func (p *Plugin) Run(ctx context.Context, Module *lua.LTable) {

	p.Reset()

	cctx, cancel := context.WithCancel(ctx)
	defer func() {
		cancel()
		close(p.Done)
		p.L.Close()
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
		case ie := <-p.incEvent:
			log.LogDebugf("req: %d", ie)
		case <-p.Done:
			cancel()
		case <-cctx.Done():
			p.sendEvent(EVENT_STOPPED)
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
