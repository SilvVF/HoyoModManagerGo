package main

import (
	"context"
	"hmm/pkg/log"
	"hmm/pkg/plugin"
	"hmm/pkg/pref"

	"github.com/wailsapp/wails/v2/pkg/logger"
	"github.com/wailsapp/wails/v2/pkg/runtime"
	lua "github.com/yuin/gopher-lua"
)

// App struct
type App struct {
	prefs          pref.PreferenceStore
	ctx            context.Context
	pluginExports  map[string]lua.LGFunction
	dev            bool
	pluginsRunning bool
}

// NewApp creates a new App application struct
func NewApp(prefs pref.PreferenceStore) *App {
	return &App{
		prefs: prefs,
		dev:   *dev,
	}
}

// startup is called at application startup
func (a *App) startup(ctx context.Context) {
	// Perform your setup here
	a.ctx = ctx

	log.InitLogging(ctx)
	log.LogDebug("app startup")
	runtime.LogSetLogLevel(ctx, logger.TRACE)
}

// domReady is called after front-end resources have been loaded
func (a App) domReady(ctx context.Context) {
	// Add your action here
}

// beforeClose is called when the application is about to quit,
// either by clicking the window close button or calling runtime.Quit.
// Returning true will cause the application to continue, false will continue shutdown as normal.
func (a *App) beforeClose(ctx context.Context) (prevent bool) {
	err := a.prefs.Close()
	if err != nil {
		log.LogError(err.Error())
	}
	return false
}

// shutdown is called at application termination
func (a *App) shutdown(ctx context.Context) {
	// Perform your teardown here

}

func (a *App) DevModeEnabled() bool {
	return a.dev
}

func (a *App) ClosePrefsDB() error {
	return a.prefs.Close()
}

func (a *App) GetExclusionPaths() ([]string, error) {
	return runtime.OpenMultipleFilesDialog(a.ctx, runtime.OpenDialogOptions{})
}

func (a *App) GetExportDirectory() (string, error) {
	return runtime.OpenDirectoryDialog(a.ctx, runtime.OpenDialogOptions{})
}

func (a *App) GetPlugins() ([]string, error) {
	return plugin.IndexPlugins()
}

func (a *App) LoadPlugins() {

	if a.pluginsRunning {
		return
	}

	plugins := plugin.New(a.pluginExports, a.ctx)
	a.pluginsRunning = true
	go plugins.Run()
}
