package log

import (
	"context"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

var logCtx context.Context

func InitLogging(ctx context.Context) {
	logCtx = ctx
}

func LogError(message string) {
	runtime.LogError(logCtx, message)
}

func LogDebug(message string) {
	runtime.LogDebug(logCtx, message)
}

func LogFatal(message string) {
	runtime.LogFatal(logCtx, message)
}

func LogPrint(message string) {
	runtime.LogPrint(logCtx, message)
}
