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
	rarFile          = "\\test_resources\\navia.rar"
	zipFile          = "\\test_resources\\clorinde.zip"
	uncompressedFile = "\\test_resources\\clorinde"

	brokenZip = "\\test_resources\\lingsha_nude_halfnude_incomletever_v101.zip"
)

var workingDir, _ = os.Getwd()

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

func TestLocalSource(t *testing.T) {
	path := filepath.Join(workingDir, zipFile)
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

	path := filepath.Join(workingDir, rarFile)
	out := filepath.Join(workingDir, "test_resources", "output")
	fmt.Println(path)

	os.RemoveAll(out)
	os.MkdirAll(out, os.ModePerm)

	size, files, contents, err := extractRAR(&XFile{
		FilePath:  path,
		OutputDir: out,
		DirMode:   0777,
		FileMode:  0777,
	},
		true,
		nil,
	)

	fmt.Println(size, files, contents)
	if err != nil {
		t.Error(err)
	}
}

func TestNoDirCreatesNewRoot(t *testing.T) {

	path := filepath.Join(workingDir, brokenZip)
	out := filepath.Join(workingDir, "test_resources", "output")
	fmt.Println(path)

	os.RemoveAll(out)
	os.MkdirAll(out, os.ModePerm)

	contents, err := extract(path, filepath.Join(workingDir, "test_resources", "output"), true, nil)

	fmt.Println(contents)
	if err != nil {
		t.Error(err)
	}
}

func TestExtractZip(t *testing.T) {

	path := filepath.Join(workingDir, zipFile)
	out := filepath.Join(workingDir, "test_resources", "output")
	fmt.Println(path)

	os.RemoveAll(out)
	os.MkdirAll(out, os.ModePerm)

	contents, err := extract(path, filepath.Join(workingDir, "test_resources", "output"), true, nil)

	fmt.Println(contents)
	if err != nil {
		t.Error(err)
	}
}
