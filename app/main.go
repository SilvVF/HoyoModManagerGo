package main

import (
	"context"
	"embed"
	"flag"
	"hmm/pkg/api"
	"hmm/pkg/core"
	"hmm/pkg/core/dbh"
	"hmm/pkg/log"
	"hmm/pkg/pref"
	"hmm/pkg/server"
	"hmm/pkg/types"
	"hmm/pkg/util"
	golog "log"
	"path/filepath"

	_ "github.com/mattn/go-sqlite3"
	"github.com/rosedblabs/rosedb/v2"
	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/logger"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/options/mac"
	"github.com/wailsapp/wails/v2/pkg/options/windows"
)

//go:embed all:frontend/dist
var assets embed.FS

//go:embed db/migrations/*.sql
var embedMigrations embed.FS

//go:embed build/hmmlogo.png
var icon []byte

//go:embed db/sql/schema.sql
var ddl string

var dev = flag.Bool("dev", false, "enable dev mode")
var prefs = flag.Int("prefs", 0, "set prefs mode 0 - DISK (DEFAULT) 1 - MEMORY")
var logType = flag.Int("log", 0, "set the log type 0 - println, 1 - file")
var logLevel = flag.String("log_level", "debub", "set level for logs")

func getAppBackgroundColor(appPrefs *core.AppPrefs) *options.RGBA {
	var bgColor *options.RGBA
	theme := appPrefs.DarkTheme.Get()
	if theme == "dark" || theme == "system" {
		bgColor = options.NewRGB(4, 4, 4)
	} else {
		bgColor = options.NewRGB(240, 240, 240)
	}
	return bgColor
}

func getLogLevel() logger.LogLevel {
	ll, err := logger.StringToLogLevel(*logLevel)
	if err != nil {
		ll = logger.DEBUG
	}
	return ll
}

func main() {
	// Create an instance of the app structure
	flag.Parse()
	ctx := context.Background()

	defaultEmitter := core.DefaultEmitter()
	toastEmitter := core.NewToastEmitter(defaultEmitter)

	// DISK
	var store pref.PrefrenceDb
	if (*prefs) == 1 {
		store = pref.NewInMemoryStore(context.Background())
	} else {
		store = pref.NewRoseDbStore(
			rosedb.Options{
				DirPath:           filepath.Join(util.GetCacheDir(), "/rosedb_basic"),
				SegmentSize:       rosedb.DefaultOptions.SegmentSize,
				Sync:              rosedb.DefaultOptions.Sync,
				BytesPerSync:      rosedb.DefaultOptions.BytesPerSync,
				WatchQueueSize:    300,
				AutoMergeCronExpr: rosedb.DefaultOptions.AutoMergeCronExpr,
			},
		)
	}

	go api.CleanCache()
	queries, dbSql := dbh.InitDbAndRunMigrations(ctx, embedMigrations, ddl)

	// CORE
	dbHelper := dbh.NewDbHelper(queries, dbSql)

	appPrefs := core.NewAppPrefs(pref.NewPrefs(store))
	util.SetRootModDirFn(appPrefs.RootModDirPref.Get)

	genshinApi := api.ApiList[types.Genshin]
	starRailApi := api.ApiList[types.StarRail]
	zenlessApi := api.ApiList[types.ZZZ]
	wuwaApi := api.ApiList[types.WuWa]
	preferenceDirs := map[types.Game]pref.Preference[string]{
		types.Genshin:  appPrefs.GenshinDirPref.Preference,
		types.ZZZ:      appPrefs.ZZZDirPref.Preference,
		types.StarRail: appPrefs.HonkaiDirPref.Preference,
		types.WuWa:     appPrefs.WuwaDirPref.Preference,
	}

	gbApi := &api.GbApi{}

	downloader := core.NewDownloader(
		dbHelper,
		appPrefs.MaxDownloadWorkersPref.Preference,
		appPrefs.SpaceSaverPref.Preference,
		defaultEmitter,
	)

	sync := core.NewSyncHelper(dbHelper, defaultEmitter, toastEmitter)
	keymapper := core.NewKeymapper(dbHelper)

	generator := core.NewGenerator(
		dbHelper,
		preferenceDirs,
		appPrefs.IgnoreDirPref.Preference,
		appPrefs.CleanModExportDirPref.Preference,
		defaultEmitter,
	)

	serverManager := server.NewServerManager(appPrefs, dbHelper, generator, toastEmitter)
	transfer := core.NewTransfer(sync, defaultEmitter, appPrefs.RootModDirPref.Preference)

	app := NewApp(appPrefs, core.NewUpdator(gbApi, preferenceDirs), transfer, dbHelper)

	err := wails.Run(&options.App{
		Title:             "hoyomodmanager",
		Width:             1024,
		Height:            768,
		MinWidth:          1024,
		MinHeight:         768,
		MaxWidth:          3840,
		MaxHeight:         2160,
		DisableResize:     false,
		Fullscreen:        false,
		Frameless:         false,
		StartHidden:       false,
		HideWindowOnClose: false,
		BackgroundColour:  getAppBackgroundColor(appPrefs),
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		Menu:     nil,
		Logger:   app.CreateLogger(),
		LogLevel: getLogLevel(),
		OnStartup: func(ctx context.Context) {
			log.InitLogging(ctx)
			defaultEmitter.Bind(ctx)
			serverManager.Listen(ctx)
			app.startup(ctx)
			go sync.RunAll(core.StartupRequest)
		},
		OnDomReady:       app.domReady,
		OnBeforeClose:    app.beforeClose,
		OnShutdown:       app.shutdown,
		WindowStartState: options.Normal,
		Bind: []any{
			app,
			// API
			genshinApi,
			starRailApi,
			zenlessApi,
			wuwaApi,
			gbApi,
			// CORE
			sync,
			dbHelper,
			downloader,
			generator,
			keymapper,
			// SERVER
			serverManager,
			// PREFRENCES - LocalStorage replacement to acces from go
			appPrefs.DarkTheme,
			appPrefs.StartScreen,
			appPrefs.HonkaiDirPref,
			appPrefs.GenshinDirPref,
			appPrefs.WuwaDirPref,
			appPrefs.ZZZDirPref,
			appPrefs.IgnoreDirPref,
			appPrefs.SortModPref,
			appPrefs.ModsAvailablePref,
			appPrefs.GenshinElementPref,
			appPrefs.HonkaiElementPref,
			appPrefs.ZenlessElementPref,
			appPrefs.WuwaElementPref,
			appPrefs.MaxDownloadWorkersPref,
			appPrefs.PlaylistGamePref,
			appPrefs.DiscoverGamePref,
			appPrefs.ServerPortPref,
			appPrefs.ServerUsernamePref,
			appPrefs.ServerPasswordPref,
			appPrefs.ServerAuthTypePref,
			appPrefs.SpaceSaverPref,
			appPrefs.CleanModExportDirPref,
			appPrefs.EnabledPluginsPref,
			appPrefs.RootModDirPref,
			appPrefs.UseViewTransitions,
			appPrefs.Oneko,
			appPrefs.ToastLevelPref,
		},
		// Windows platform specific options
		Windows: &windows.Options{
			WebviewIsTransparent: false,
			WindowIsTranslucent:  false,
			DisableWindowIcon:    false,
			// DisableFramelessWindowDecorations: false,
			WebviewUserDataPath: "",
			ZoomFactor:          1.0,
		},
		// Mac platform specific options
		Mac: &mac.Options{
			TitleBar: &mac.TitleBar{
				TitlebarAppearsTransparent: true,
				HideTitle:                  false,
				HideTitleBar:               false,
				FullSizeContent:            false,
				UseToolbar:                 false,
				HideToolbarSeparator:       true,
			},
			Appearance:           mac.NSAppearanceNameDarkAqua,
			WebviewIsTransparent: true,
			WindowIsTranslucent:  true,
			About: &mac.AboutInfo{
				Title:   "hoyomodmanager",
				Message: "",
				Icon:    icon,
			},
		},
	})

	if err != nil {
		golog.Fatal(err)
	}
}
