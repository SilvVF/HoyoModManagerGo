package main

import (
	"context"
	"hmm/pkg/core"
	"hmm/pkg/log"
	"hmm/pkg/plugin"
	"path/filepath"

	"github.com/wailsapp/wails/v2/pkg/logger"
	"github.com/wailsapp/wails/v2/pkg/runtime"
	lua "github.com/yuin/gopher-lua"
)

const (
	EVENT_PLUGINS = "plugins_event"

	EVENT_PLUGINS_STARTED = "plugins_started"
	EVENT_PLUGINS_STOPPED = "plugins_stopped"

	EVENT_PLUGIN_STARTED = "plugin_started"
	EVENT_PLUGIN_ERROR   = "plugin_error"
	EVENT_PLUGIN_INFO    = "plugin_info"
	EVENT_PLUGIN_STOPPED = "plugin_stopped"
)

// App struct
type App struct {
	ctx           context.Context
	dev           bool
	pluginExports map[string]lua.LGFunction
	plugins       *plugin.Plugins
	appPrefs      *core.AppPrefs
}

// NewApp creates a new App application struct
func NewApp(appPrefs *core.AppPrefs) *App {
	return &App{
		appPrefs: appPrefs,
		dev:      *dev,
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
	err := a.appPrefs.Close()
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
	return a.appPrefs.Close()
}

func (a *App) GetExclusionPaths() ([]string, error) {
	return runtime.OpenMultipleFilesDialog(a.ctx, runtime.OpenDialogOptions{})
}

func (a *App) GetExportDirectory() (string, error) {
	return runtime.OpenDirectoryDialog(a.ctx, runtime.OpenDialogOptions{})
}

func (a *App) emitPluginEvent(event string, data ...interface{}) {
	runtime.EventsEmit(
		a.ctx,
		EVENT_PLUGINS,
		event,
		data,
	)
}

type PluginState struct {
	LastEvent int    `json:"LastEvent"`
	Path      string `json:"Path"`
	Flags     int    `json:"Flags"`
}

type PluginsState struct {
	Started     bool          `json:"Started"`
	PluginState []PluginState `json:"PluginState"`
}

func (a *App) GetPluginsState() *PluginsState {

	state := &PluginsState{
		Started:     false,
		PluginState: []PluginState{},
	}

	if a.plugins == nil {
		return state
	}

	for _, ps := range a.plugins.GetState() {

		state.PluginState = append(state.PluginState, PluginState{
			LastEvent: ps.LastEvent.Etype,
			Path:      filepath.Base(ps.LastEvent.Path),
			Flags:     ps.Flags,
		})
	}

	return state
}

func (a *App) StartPlugins() {

	if a.plugins != nil {
		return
	}

	a.plugins = plugin.New(a.pluginExports, a.ctx, a.appPrefs.EnabledPluginsPref)
	a.emitPluginEvent(EVENT_PLUGINS_STARTED)

	go a.plugins.Run(func(pe plugin.PluginEvent) {
		switch pe.Etype {
		case plugin.EVENT_ERROR:
			a.emitPluginEvent(EVENT_PLUGIN_ERROR, pe.Path, pe.Data)
		case plugin.EVENT_INFO:
			a.emitPluginEvent(EVENT_PLUGIN_INFO, pe.Path, pe.Data)
		case plugin.EVENT_STOPPED:
			a.emitPluginEvent(EVENT_PLUGIN_STOPPED, pe.Path, pe.Data)
		}
	})
}

func (a *App) StopPlugins() {
	if a.plugins == nil {
		return
	}
	a.plugins.Stop()
	a.emitPluginEvent(EVENT_PLUGINS_STOPPED)
	a.plugins = nil
}
