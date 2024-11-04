package main

import (
	"context"
	"database/sql"
	"embed"
	"hmm/db"
	"hmm/pkg/api"
	"hmm/pkg/core"
	"hmm/pkg/pref"
	"hmm/pkg/server"
	"hmm/pkg/types"
	"hmm/pkg/util"
	"log"
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

func main() {
	// Create an instance of the app structure
	debug := false

	argsWithoutProg := os.Args[1:]
	if len(argsWithoutProg) >= 1 {
		debug = argsWithoutProg[0] == "debug"
	}

	ctx := context.Background()
	var store pref.PrefrenceDb
	if debug {
		store = pref.NewMemoryPrefs(context.Background())
	} else {
		store = pref.NewRosePrefDb(
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
	app := NewApp(pref.NewPrefs(store))

	genshinApi := api.ApiList[types.Genshin]
	starRailApi := api.ApiList[types.StarRail]
	zenlessApi := api.ApiList[types.ZZZ]
	wuwaApi := api.ApiList[types.WuWa]

	gbApi := &api.GbApi{}

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
	appPrefs := core.NewAppPrefs(app.prefs)

	preferenceDirs := map[types.Game]pref.Preference[string]{
		types.Genshin:  appPrefs.GenshinDirPref.Preference,
		types.ZZZ:      appPrefs.ZZZDirPref.Preference,
		types.StarRail: appPrefs.HonkaiDirPref.Preference,
		types.WuWa:     appPrefs.WuwaDirPref.Preference,
	}

	dbHelper := core.NewDbHelper(queries, dbSql)
	downloader := core.NewDownloader(dbHelper, appPrefs.MaxDownloadWorkersPref.Preference)
	sync := core.NewSyncHelper(dbHelper)
	stats := core.NewStats(preferenceDirs)
	keymapper := core.NewKeymapper(dbHelper)

	serverManager := server.NewServerManager(appPrefs, dbHelper)

	generator := core.NewGenerator(
		dbHelper,
		preferenceDirs,
		appPrefs.IgnoreDirPref.Preference,
	)

	// Create application with options
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
		BackgroundColour:  &options.RGBA{R: 255, G: 255, B: 255, A: 255},
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		Menu:     nil,
		Logger:   nil,
		LogLevel: logger.DEBUG,
		OnStartup: func(ctx context.Context) {
			downloader.Ctx = ctx
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
			stats,
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
		log.Fatal(err)
	}
}
