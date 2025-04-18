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

func LogErrorf(format string, args ...any) {
	if !initialized {
		log.Printf(format, args...)
		return
	}
	runtime.LogErrorf(logCtx, format, args...)
}

func LogError(message string) {
	if !initialized {
		log.Println(message)
		return
	}
	runtime.LogError(logCtx, message)
}

func LogDebugf(format string, args ...any) {
	if !initialized {
		log.Printf(format, args...)
		return
	}
	runtime.LogDebugf(logCtx, format, args...)
}

func LogDebug(message string) {
	if !initialized {
		log.Println(message)
		return
	}
	runtime.LogDebug(logCtx, message)
}

func LogFatalf(format string, args ...any) {
	if !initialized {
		log.Fatalf(format, args...)
		return
	}
	runtime.LogFatalf(logCtx, format, args...)
}

func LogFatal(message string) {
	if !initialized {
		log.Fatalln(message)
		return
	}
	runtime.LogFatal(logCtx, message)
}

func LogPrintf(format string, args ...any) {
	if !initialized {
		log.Printf(format, args...)
		return
	}
	runtime.LogPrintf(logCtx, format, args...)
}

func LogPrint(message string) {
	if !initialized {
		log.Println(message)
		return
	}
	runtime.LogPrint(logCtx, message)
}
