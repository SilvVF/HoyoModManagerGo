package main

import (
	"context"
	"database/sql"
	"embed"
	"hmm/db"
	"hmm/pkg/api"
	"hmm/pkg/core"
	"log"
	"os"
	"path/filepath"

	_ "github.com/mattn/go-sqlite3"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/logger"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/options/mac"
	"github.com/wailsapp/wails/v2/pkg/options/windows"
)

//go:embed all:frontend/dist
var assets embed.FS

//go:embed build/appicon.png
var icon []byte

//go:embed schema.sql
var ddl string

func main() {
	// Create an instance of the app structure
	app := NewApp()

	ctx := context.Background()

	genshinApi := &api.GenshinApi{}
	starRailApi := &api.StarRailApi{}
	gbApi := &api.GbApi{}
	downloader := &core.Downloader{}

	dbfile := filepath.Join(core.GetCacheDir(), "hmm.db")

	os.MkdirAll(filepath.Dir(dbfile), os.ModePerm)

	core.CreateFileIfNotExists(dbfile)

	dbSql, err := sql.Open("sqlite3", dbfile)
	if err != nil {
		panic(err)
	}

	// create tables
	if _, err := dbSql.ExecContext(ctx, ddl); err != nil {
		panic(err)
	}

	queries := db.New(dbSql)

	dbHelper := core.NewDbHelper(queries)
	sync := core.NewSyncHelper(dbHelper)

	prefs := core.NewPrefs()
	defer prefs.Close()

	bind := []interface{}{
		app,
		genshinApi,
		starRailApi,
		gbApi,
		sync,
		dbHelper,
		downloader,
	}

	bind = append(bind, core.AppPrefs(prefs)...)

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
		Menu:             nil,
		Logger:           nil,
		LogLevel:         logger.DEBUG,
		OnStartup:        app.startup,
		OnDomReady:       app.domReady,
		OnBeforeClose:    app.beforeClose,
		OnShutdown:       app.shutdown,
		WindowStartState: options.Normal,
		Bind:             bind,
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
