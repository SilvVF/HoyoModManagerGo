package main

import (
	"context"
	"database/sql"
	"embed"
	"flag"
	"hmm/db"
	"hmm/pkg/api"
	"hmm/pkg/core"
	"hmm/pkg/log"
	"hmm/pkg/pref"
	"hmm/pkg/server"
	"hmm/pkg/types"
	"hmm/pkg/util"
	golog "log"
	"os"
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

//go:embed build/appicon.jpg
var icon []byte

//go:embed schema.sql
var ddl string

var dev = flag.Bool("dev", false, "enable dev mode")
var prefs = flag.Int("prefs", 0, "set prefs mode 0 - DISK (DEFAULT) 1 - MEMORY")
var logType = flag.Int("log", 0, "set the log type 0 - println, 1 - file")

func main() {
	// Create an instance of the app structure
	flag.Parse()
	ctx := context.Background()

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
	appPrefs := core.NewAppPrefs(pref.NewPrefs(store))
	defaultEmitter := core.DefaultEmitter()
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

	app := NewApp(appPrefs, core.NewUpdator(gbApi, preferenceDirs))

	dbfile := filepath.Join(util.GetCacheDir(), "hmm.db")

	os.MkdirAll(filepath.Dir(dbfile), os.ModePerm)

	util.CreateFileIfNotExists(dbfile)

	dbSql, err := sql.Open("sqlite3", dbfile)
	if err != nil {
		panic(err)
	}

	// create tables
	if _, err := dbSql.ExecContext(ctx, ddl); err != nil {
		panic(err)
	}

	queries := db.New(dbSql)

	dbHelper := core.NewDbHelper(queries, dbSql)
	downloader := core.NewDownloader(
		dbHelper,
		appPrefs.MaxDownloadWorkersPref.Preference,
		appPrefs.SpaceSaverPref.Preference,
		defaultEmitter,
	)
	sync := core.NewSyncHelper(dbHelper)
	go sync.RunStartup()

	keymapper := core.NewKeymapper(dbHelper)

	generator := core.NewGenerator(
		dbHelper,
		preferenceDirs,
		appPrefs.IgnoreDirPref.Preference,
		appPrefs.CleanModExportDirPref.Preference,
	)

	serverManager := server.NewServerManager(appPrefs, dbHelper, generator)

	var bgColor *options.RGBA
	theme := appPrefs.DarkTheme.Get()
	if theme == "dark" || theme == "system" {
		bgColor = options.NewRGB(4, 4, 4)
	} else {
		bgColor = options.NewRGB(240, 240, 240)
	}

	err = wails.Run(&options.App{
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
		BackgroundColour:  bgColor,
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		Menu:     nil,
		Logger:   app.CreateLogger(),
		LogLevel: logger.DEBUG,
		OnStartup: func(ctx context.Context) {
			log.InitLogging(ctx)
			defaultEmitter.Bind(ctx)
			serverManager.Listen(ctx)
			app.startup(ctx)
		},
		OnDomReady:       app.domReady,
		OnBeforeClose:    app.beforeClose,
		OnShutdown:       app.shutdown,
		WindowStartState: options.Normal,
		Bind: []interface{}{
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
