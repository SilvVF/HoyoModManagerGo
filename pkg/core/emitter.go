package core

import (
	"context"
	"hmm/pkg/log"
	golog "log"
	goruntime "runtime"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

type EventEmmiter interface {
	Bind(ctx context.Context)
	Emit(eventName string, optionalData ...interface{})
}

type TestEvent struct {
	e    string
	data []any
}

type TestEmmiter struct {
	events chan TestEvent
}

func TestEmitter() *TestEmmiter {
	return &TestEmmiter{
		events: make(chan TestEvent),
	}
}

func (te *TestEmmiter) Bind(ctx context.Context) {
}

func (te *TestEmmiter) Emit(eventName string, optionalData ...interface{}) {
	te.events <- TestEvent{eventName, optionalData}
}

type DefaultEmmiter struct {
	ctx         context.Context
	initialized bool
}

func DefaultEmitter() EventEmmiter {
	return &DefaultEmmiter{
		initialized: false,
	}
}

func (de *DefaultEmmiter) Bind(ctx context.Context) {
	result := ctx.Value("events")
	if result != nil {
		de.initialized = true
		de.ctx = ctx
		return
	}
	pc, _, _, _ := goruntime.Caller(1)
	funcName := goruntime.FuncForPC(pc).Name()
	golog.Fatalf("cannot bind non application ctx '%s'", funcName)
}

func (de *DefaultEmmiter) Emit(eventName string, optionalData ...interface{}) {

	if !de.initialized {
		log.LogDebugf("Not initialized unable emit event: %s, data: %v", eventName, optionalData)
		return
	}

	runtime.EventsEmit(de.ctx, eventName, optionalData...)
}
