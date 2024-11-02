package log

import (
	"context"
	"log"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

var logCtx context.Context
var initialized = false

func InitLogging(ctx context.Context) {
	logCtx = ctx
	initialized = true
}

func LogError(message string) {
	if !initialized {
		log.Print(message)
		return
	}
	runtime.LogError(logCtx, message)
}

func LogDebug(message string) {
	if !initialized {
		log.Println(message)
		return
	}
	runtime.LogDebug(logCtx, message)
}

func LogFatal(message string) {
	if !initialized {
		log.Println(message)
		return
	}
	runtime.LogFatal(logCtx, message)
}

func LogPrint(message string) {
	if !initialized {
		log.Println(message)
		return
	}
	runtime.LogPrint(logCtx, message)
}
