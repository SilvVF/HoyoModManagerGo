package core

import (
	"context"
	"database/sql"
	"fmt"
	"hmm/db"
	"hmm/pkg/log"
	"hmm/pkg/pref"
	"hmm/pkg/types"
	"hmm/pkg/util"
	"os"
	"path/filepath"
	"sync"
	"testing"

	_ "github.com/mattn/go-sqlite3"
)

const (
	rarFile          = "navia.rar"
	zipFile          = "clorinde_new1.zip"
	uncompressedFile = "clorinde"
)

func _getDb() *DbHelper {
	dbfile := filepath.Join(util.GetCacheDir(), "hmm.db")

	os.MkdirAll(filepath.Dir(dbfile), os.ModePerm)

	util.CreateFileIfNotExists(dbfile)

	dbSql, err := sql.Open("sqlite3", dbfile)
	if err != nil {
		panic(err)
	}

	return NewDbHelper(db.New(dbSql), dbSql)
}

func TestZip(t *testing.T) {

	path := "C:\\Users\\david\\dev\\go\\skin-mod-manager\\test_resources\\clorinde"
	out := "C:\\Users\\david\\dev\\go\\skin-mod-manager\\test_resources\\clorinde_new1.zip"
	err := ZipFolder(path, out, func(total, complete int) {})
	t.Error(err.Error())
}

var testResources = "C:\\Users\\david\\dev\\go\\skin-mod-manager\\test_resources"

func TestGoogleDrive(t *testing.T) {
	path := filepath.Join(testResources, zipFile)
	fmt.Println(path)

	ctx := context.Background()

	memStore := pref.NewInMemoryStore(ctx)
	prefs := pref.NewPrefs(memStore)
	emitter := TestEmitter()

	downloader := NewDownloader(
		_getDb(),
		prefs.GetInt("test_workers", 1),
		prefs.GetBoolean("test_space_saver", false),
		emitter,
	)

	wg := sync.WaitGroup{}
	wg.Add(1)

	go func() {
		defer wg.Done()

		for {
			e, ok := <-emitter.events
			log.LogPrintf("event: %s, data: %v", e.e, e.data)
			if !ok || e.data[0].(string) == STATE_ERROR {
				t.Fail()
				return
			} else if e.data[0].(string) == STATE_FINSIHED {
				return
			}
		}
	}()

	err := downloader.Download(
		"https://drive.google.com/file/d/1p0lTVWiOTbpidTpRzIJ-B15P8BOyiXWq/view",
		"",
		"Clorinde",
		10000098,
		types.Genshin,
		0,
		[]string{},
	)

	if err != nil {
		t.Error(err)
	}

	wg.Wait()
	t.Fail()
}

func TestLocalSource(t *testing.T) {
	path := filepath.Join(testResources, zipFile)
	fmt.Println(path)

	ctx := context.Background()

	memStore := pref.NewInMemoryStore(ctx)
	prefs := pref.NewPrefs(memStore)
	emitter := TestEmitter()

	downloader := NewDownloader(
		_getDb(),
		prefs.GetInt("test_workers", 1),
		prefs.GetBoolean("test_space_saver", true),
		emitter,
	)

	wg := sync.WaitGroup{}
	wg.Add(1)

	go func() {
		defer wg.Done()

		for {
			e, ok := <-emitter.events
			log.LogPrintf("event: %s, data: %v", e.e, e.data)
			if !ok || e.data[0].(string) == STATE_ERROR {
				t.Fail()
				return
			} else if e.data[0].(string) == STATE_FINSIHED {
				return
			}
		}
	}()

	err := downloader.Download(
		path,
		"clorindemodtest",
		"Clorinde",
		10000098,
		types.Genshin,
		0,
		[]string{},
	)

	if err != nil {
		t.Error(err)
	}

	wg.Wait()
}

func TestExtractRar(t *testing.T) {

	path := filepath.Join(testResources, rarFile)
	out := filepath.Join(testResources, "output", "rar_test")
	fmt.Println(path)

	os.RemoveAll(out)
	os.MkdirAll(out, os.ModePerm)

	fp := int64(0)
	ft := int64(0)

	root, err := archiveExtract(path, out, true, func(progress, total int64) {
		log.LogDebugf("%d / %d bytes", progress, total)
		fp = progress
		ft = total
	})

	log.LogDebug(root)

	if err != nil {
		t.Error(err)
	}

	if fp != ft {
		t.Error("progress was not equal to total")
	}
}

func TestExtractZip(t *testing.T) {

	path := filepath.Join(testResources, zipFile)
	out := filepath.Join(testResources, "output", "ZIP_test")

	fmt.Println(path)

	os.RemoveAll(out)
	os.MkdirAll(out, os.ModePerm)

	fp := int64(0)
	ft := int64(0)

	root, err := archiveExtract(path, out, true, func(progress, total int64) {
		log.LogDebugf("%d / %d bytes", progress, total)
		fp = progress
		ft = total
	})

	log.LogDebug(root)

	if err != nil {
		t.Error(err)
	}

	if fp != ft {
		t.Error("progress was not equal to total")
	}
}
