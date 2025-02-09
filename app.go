package main

import (
	"context"
	"errors"
	"hmm/pkg/core"
	"hmm/pkg/log"
	"hmm/pkg/plugin"
	"hmm/pkg/types"
	"hmm/pkg/util"
	"io/fs"
	"os"
	"path/filepath"
	"strings"

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

func getDirSize(path string) (int64, error) {
	var totalSize int64

	err := filepath.Walk(path, func(_ string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if !info.IsDir() {
			totalSize += info.Size()
		}

		return nil
	})

	return totalSize, err
}

func (a *App) GetStats() (*types.DownloadStats, error) {
	log.LogDebug("Getting stats")
	bytes, rootInfo, err := getDirInfo(util.GetRootModDir())

	empty := &types.DownloadStats{Data: [][]types.FileInfo{}, TotalBytes: 0}

	log.LogDebugf("got dir info %v %v", bytes, rootInfo)

	if err != nil {
		log.LogDebugf("failed with %v", err)
		return empty, err
	}

	res := &types.DownloadStats{
		TotalBytes: bytes,
		Data:       [][]types.FileInfo{rootInfo},
	}

	log.LogDebug("created download stats")

	for _, game := range types.Games {

		gameDir := util.GetGameDir(game)
		log.LogDebugf("got game dir %s", gameDir)
		_, dirInfos, err := getDirInfo(gameDir)

		log.LogDebugf("got dir info %v", dirInfos)

		if err != nil {
			log.LogDebugf("Skipping directory %s due to error: %v", gameDir, err)
			continue
		}
		res.Data = append(res.Data, dirInfos)
	}

	return res, nil
}

func getDirInfo(root string) (int64, []types.FileInfo, error) {
	infos := []types.FileInfo{}
	total := int64(0)

	if ok, err := util.FileExists(root); !ok || err != nil {
		return 0, infos, errors.New("file not found")
	}

	err := filepath.WalkDir(root, func(path string, d fs.DirEntry, err error) error {

		relPath := strings.TrimPrefix(path, root)
		segs := strings.Split(relPath, string(filepath.Separator))

		if len(segs) > 2 || !d.IsDir() {
			return nil
		}

		size := int64(0)
		if len(segs) == 2 {
			if s, err := getDirSize(path); err == nil {
				size = s
			}
		}

		total += size
		infos = append(infos, types.FileInfo{
			File:  path,
			Bytes: size,
		})
		return nil
	})

	return total, infos, err
}

// NewApp creates a new App application struct
func NewApp(appPrefs *core.AppPrefs) *App {
	return &App{
		appPrefs:      appPrefs,
		dev:           *dev,
		pluginExports: make(map[string]lua.LGFunction),
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

func (a *App) ForcePanic() {
	if a.dev {
		panic("forced panic from dev mode")
	}
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

func (a *App) LoadPlugins() error {
	if a.plugins == nil {
		return errors.New("plugins not running")
	}

	return a.plugins.LoadPlugins()
}

func (a *App) StartPlugins() error {

	if a.plugins != nil {
		return errors.New("plugins already running")
	}

	plugins := plugin.New(a.pluginExports, a.ctx, a.appPrefs.EnabledPluginsPref)
	a.plugins = plugins

	if err := plugins.LoadPlugins(); err != nil {
		return err
	}

	a.emitPluginEvent(EVENT_PLUGINS_STARTED)

	go plugins.Run(func(pe plugin.PluginEvent) {
		switch pe.Etype {
		case plugin.EVENT_ERROR:
			a.emitPluginEvent(EVENT_PLUGIN_ERROR, pe.Path, pe.Data)
		case plugin.EVENT_INFO:
			a.emitPluginEvent(EVENT_PLUGIN_INFO, pe.Path, pe.Data)
		case plugin.EVENT_STOPPED:
			a.emitPluginEvent(EVENT_PLUGIN_STOPPED, pe.Path, pe.Data)
		}
	})

	return nil
}

func (a *App) StopPlugins() error {
	if a.plugins == nil {
		return errors.New("plugins already stopped")
	}

	a.plugins.Stop()
	a.emitPluginEvent(EVENT_PLUGINS_STOPPED)
	a.plugins = nil

	return nil
}
