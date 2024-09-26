package core

import (
	"context"
	"errors"
	"fmt"
	"hmm/pkg/log"
	"hmm/pkg/types"
	"io"
	"net/http"
	"os"
	"path"
	"path/filepath"
	"strconv"
	"strings"
	"sync"

	"github.com/alitto/pond"
	"github.com/nwaples/rardecode"
	"github.com/wailsapp/wails/v2/pkg/runtime"

	unarr "github.com/gen2brain/go-unarr"
)

// TODO: auto retry downloads on error

const (
	TYPE_DOWNLOAD = "download"
	TYPE_QUEUED   = "queued"
	TYPE_FINISHED = "finished"
	TYPE_ERROR    = "error"
	TYPE_UNZIP    = "unzip"
)

var (
	ErrNoCompressedFiles  = errors.New("no compressed files found")
	ErrUnknownArchiveType = errors.New("unknown archive file type")
	ErrInvalidPath        = errors.New("archived file contains invalid path")
	ErrInvalidHead        = errors.New("archived file contains invalid header file")
)

type DLMeta struct {
	character   string
	characterId int
	game        types.Game
	gbId        int
}

type DLItem struct {
	Filename string       `json:"filename"`
	Link     string       `json:"link"`
	State    string       `json:"state"`
	Unzip    DataProgress `json:"unzip"`
	Fetch    DataProgress `json:"fetch"`
	meta     DLMeta
}

type Downloader struct {
	db    *DbHelper
	Ctx   context.Context
	count Preference[int]
	pool  *pond.WorkerPool
	mutex *sync.Mutex
	Queue map[string]*DLItem `json:"queue"`
}

func NewDownloader(db *DbHelper, count Preference[int]) *Downloader {
	return &Downloader{
		db:    db,
		mutex: &sync.Mutex{},
		count: count,
		pool:  pond.New(count.Get(), 100),
		Queue: map[string]*DLItem{},
	}
}

func (d *Downloader) GetQueue() map[string]*DLItem {

	d.mutex.Lock()
	defer d.mutex.Unlock()

	copy := make(map[string]DLItem)
	for link, item := range d.Queue {
		copy[link] = *item
	}

	return d.Queue
}

func (d *Downloader) RemoveFromQueue(key string) {
	d.mutex.Lock()
	delete(d.Queue, key)
	d.mutex.Unlock()
}

func (d *Downloader) Delete(modId int) error {
	mod, err := d.db.SelectModById(modId)
	if err != nil {
		log.LogPrint(err.Error())
		return err
	}
	path := path.Join(GetCharacterDir(mod.Character, mod.Game), mod.Filename)
	log.LogPrint(path)
	if err = os.RemoveAll(path); err != nil {
		return err
	}
	return d.db.DeleteModById(modId)
}

type DataProgress struct {
	Total    int64 `json:"total"`
	Progress int64 `json:"progress"`
}

type countingWriter struct {
	count      int64
	onProgress func(int64)
}

func (cw *countingWriter) Write(p []byte) (int, error) {
	n := len(p)
	cw.count += int64(n)
	cw.onProgress(cw.count)
	return n, nil
}

func (d *Downloader) Stop() {
	d.pool.Stop()
}

func (d *Downloader) Retry(link string) error {
	d.mutex.Lock()
	item, ok := d.Queue[link]
	if !ok {
		return errors.New("item not found")
	}
	delete(d.Queue, item.Link)
	d.mutex.Unlock()
	return d.Download(item.Link, item.Filename, item.meta.character, item.meta.characterId, item.meta.game, item.meta.gbId)
}

func (d *Downloader) restart() {
	d.pool = pond.New(d.count.Get(), 100)

	d.mutex.Lock()
	defer d.mutex.Unlock()

	for _, item := range d.Queue {
		if item.State != TYPE_FINISHED {
			item.State = TYPE_QUEUED
			item.Fetch = DataProgress{}
			item.Unzip = DataProgress{}
			d.pool.Submit(func() {
				d.internalDonwload(item.Link, item.Filename, item.meta.character, item.meta.characterId, item.meta.game, item.meta.gbId)
			})
		}
	}
}

func (d *Downloader) Download(link, filename, character string, characterId int, game types.Game, gbId int) error {

	if _, ok := d.Queue[link]; ok {
		return errors.New("already downloading")
	}

	if d.pool.Stopped() {
		d.restart()
	}

	d.mutex.Lock()
	d.Queue[link] = &DLItem{
		Filename: filename,
		Link:     link,
		State:    TYPE_QUEUED,
		meta: DLMeta{
			character:   character,
			characterId: characterId,
			game:        game,
			gbId:        gbId,
		},
	}
	d.mutex.Unlock()

	runtime.EventsEmit(
		d.Ctx,
		"download",
		TYPE_QUEUED,
	)

	d.pool.Submit(func() {
		d.internalDonwload(link, filename, character, characterId, game, gbId)
	})

	return nil
}

func (d *Downloader) internalDonwload(link, filename, character string, characterId int, game types.Game, gbId int) (err error) {
	log.LogPrint(fmt.Sprintf("Downloading %s %d", character, game))

	defer func() {
		item, ok := d.Queue[link]
		if !ok {
			return
		}
		if err != nil {
			log.LogError(err.Error())
			item.State = TYPE_ERROR
			runtime.EventsEmit(d.Ctx, "download", TYPE_ERROR)
		} else {
			item.State = TYPE_FINISHED
			runtime.EventsEmit(d.Ctx, "download", TYPE_FINISHED)
		}
	}()

	updateProgress := func(state string, dp DataProgress) {
		d.mutex.Lock()
		defer d.mutex.Unlock()

		item, ok := d.Queue[link]
		if !ok {
			return
		}
		item.State = state
		switch state {
		case TYPE_DOWNLOAD:
			item.Fetch = dp
		case TYPE_UNZIP:
			item.Unzip = dp
		}
	}
	// Determinate the file size
	resp, err := http.Head(link)
	if err != nil {
		return
	}
	contentLength := resp.Header.Get("content-length")
	total, err := strconv.Atoi(contentLength)
	if err != nil {
		return
	}

	res, err := http.Get(link)
	if err != nil {
		return
	}
	defer res.Body.Close()

	byteCounter := io.TeeReader(res.Body, &countingWriter{
		onProgress: func(p int64) {
			updateProgress(
				TYPE_DOWNLOAD,
				DataProgress{
					Total:    int64(total),
					Progress: p,
				},
			)
		},
	})

	file, err := os.CreateTemp("", "*"+filename)
	if err != nil {
		return
	}
	if _, err = io.Copy(file, byteCounter); err != nil {
		return
	}
	file.Close()
	defer os.RemoveAll(file.Name())

	dotIdx := strings.LastIndex(filename, ".")
	outputDir := path.Join(GetCharacterDir(character, game), filename[:dotIdx])
	_ = os.MkdirAll(outputDir, 0777)

	onProgress := func(progress int64, total int64) {
		updateProgress(
			TYPE_UNZIP,
			DataProgress{
				Progress: progress,
				Total:    total,
			},
		)
	}

	filePath := file.Name()

	if strings.Contains(filename[dotIdx:], ".rar") {
		log.LogDebug("extracting rar " + filename)
		if _, _, _, err = extractRAR(&XFile{FilePath: filePath, OutputDir: outputDir, DirMode: 0777, FileMode: 0777}, onProgress); err != nil {
			return
		}
	} else {
		log.LogDebug("extracting using unarr " + filename)
		if _, err = extract(filePath, outputDir, onProgress); err != nil {
			return
		}
	}

	return d.db.InsertMod(types.Mod{
		Filename:       filename[:dotIdx],
		Game:           game,
		Character:      character,
		CharacterId:    characterId,
		Enabled:        false,
		PreviewImages:  []string{},
		GbId:           gbId,
		ModLink:        link,
		GbFileName:     filename,
		GbDownloadLink: link,
	})
}

func archiveUncompressedSize(a *unarr.Archive) (int64, error) {
	total := int64(0)
	for {
		e := a.Entry()
		if e != nil {
			if e == io.EOF {
				break
			}
			return 0, e
		}

		total += int64(a.Size())
	}
	return total, nil
}

func extract(archivePath, path string, onProgress func(progress int64, total int64)) (contents []string, err error) {
	log.LogDebug("Archive path: " + archivePath)
	sizeA, err := unarr.NewArchive(archivePath)
	if err != nil {
		log.LogDebug("error creating size archive")
		return
	}
	total, err := archiveUncompressedSize(sizeA)
	if err != nil {
		log.LogDebug("error reading archive size")
	}
	log.LogDebug(fmt.Sprintf("archive size %d", total))
	progress := int64(0)
	sizeA.Close()

	a, err := unarr.NewArchive(archivePath)
	if err != nil {
		return contents, err
	}
	defer a.Close()

	onProgress(progress, total)

	for {
		e := a.Entry()
		if e != nil {
			if e == io.EOF {
				break
			}

			err = e
			return
		}

		name := a.Name()
		contents = append(contents, name)
		data, e := a.ReadAll()
		if e != nil {
			err = e
			return
		}

		dirname := filepath.Join(path, filepath.Dir(name))
		_ = os.MkdirAll(dirname, 0755)

		e = os.WriteFile(filepath.Join(dirname, filepath.Base(name)), data, 0644)
		if e != nil {
			err = e
			return
		}
		progress += int64(a.Size())
		onProgress(progress, total)
	}

	return
}

func extractRAR(xFile *XFile, onProgress func(progress int64, total int64)) (int64, []string, []string, error) {
	rarReader, err := rardecode.OpenReader(xFile.FilePath, xFile.Password)
	if err != nil {
		return 0, nil, nil, fmt.Errorf("rardecode.OpenReader: %w", err)
	}
	defer rarReader.Close()

	size, files, err := unrar(xFile, rarReader, onProgress)
	if err != nil {
		lastFile := xFile.FilePath
		if volumes := rarReader.Volumes(); len(volumes) > 0 {
			lastFile = volumes[len(volumes)-1]
		}

		return size, files, rarReader.Volumes(), fmt.Errorf("%s: %w", lastFile, err)
	}

	return size, files, rarReader.Volumes(), nil
}

// clean returns an absolute path for a file inside the OutputDir.
// If trim length is > 0, then the suffixes are trimmed, and filepath removed.
func clean(x *XFile, filePath string, trim ...string) string {
	if len(trim) != 0 {
		filePath = filepath.Base(filePath)
		for _, suffix := range trim {
			filePath = strings.TrimSuffix(filePath, suffix)
		}
	}

	return filepath.Clean(filepath.Join(x.OutputDir, filePath))
}

func rarUncompressedSize(rarReader *rardecode.ReadCloser) (int64, error) {
	var totalSize int64 = 0

	// Iterate through each file in the archive
	for {
		header, err := rarReader.Next()
		if err != nil {
			if err == io.EOF {
				// End of archive
				break
			}
			return 0, fmt.Errorf("error reading archive: %w", err)
		}

		// Accumulate the uncompressed size
		totalSize += header.UnPackedSize
	}
	return totalSize, nil
}

// XFile defines the data needed to extract an archive.
type XFile struct {
	// Path to archive being extracted.
	FilePath string
	// Folder to extract archive into.
	OutputDir string
	// Write files with this mode.
	FileMode os.FileMode
	// Write folders with this mode.
	DirMode os.FileMode
	// (RAR/7z) Archive password. Blank for none. Gets prepended to Passwords, below.
	Password string
	// (RAR/7z) Archive passwords (to try multiple).
	Passwords []string
}

func unrar(x *XFile, rarReader *rardecode.ReadCloser, onProgress func(progress int64, total int64)) (int64, []string, error) {
	files := []string{}
	size := int64(0)

	var total int64
	if sizeReader, err := rardecode.OpenReader(x.FilePath, ""); err != nil {
		return size, files, fmt.Errorf("error reading total size %w", err)
	} else {
		t, _ := rarUncompressedSize(sizeReader)
		total = t
	}

	onProgress(0, total)

	for {
		header, err := rarReader.Next()

		switch {
		case errors.Is(err, io.EOF):
			return size, files, nil
		case err != nil:
			return size, files, fmt.Errorf("rarReader.Next: %w", err)
		case header == nil:
			return size, files, fmt.Errorf("%w: %s", ErrInvalidHead, x.FilePath)
		}

		wfile := clean(x, header.Name)
		//nolint:gocritic // this 1-argument filepath.Join removes a ./ prefix should there be one.
		if !strings.HasPrefix(wfile, filepath.Join(x.OutputDir)) {
			// The file being written is trying to write outside of our base path. Malicious archive?
			return size, files, fmt.Errorf("%s: %w: %s != %s (from: %s)",
				x.FilePath, ErrInvalidPath, wfile, x.OutputDir, header.Name)
		}

		if header.IsDir {
			if err = os.MkdirAll(wfile, x.DirMode); err != nil {
				return size, files, fmt.Errorf("os.MkdirAll: %w", err)
			}

			continue
		}

		if err = os.MkdirAll(filepath.Dir(wfile), x.DirMode); err != nil {
			return size, files, fmt.Errorf("os.MkdirAll: %w", err)
		}

		fSize, err := writeFile(wfile, rarReader, x.FileMode, x.DirMode)
		if err != nil {
			return size, files, err
		}

		files = append(files, wfile)
		size += fSize
		go onProgress(size, total)
	}
}

// writeFile writes a file from an io reader, making sure all parent directories exist.
func writeFile(fpath string, fdata io.Reader, fMode, dMode os.FileMode) (int64, error) {
	if err := os.MkdirAll(filepath.Dir(fpath), dMode); err != nil {
		return 0, fmt.Errorf("os.MkdirAll: %w", err)
	}

	fout, err := os.OpenFile(fpath, os.O_RDWR|os.O_CREATE|os.O_TRUNC, fMode)
	if err != nil {
		return 0, fmt.Errorf("os.OpenFile: %w", err)
	}
	defer fout.Close()

	s, err := io.Copy(fout, fdata)
	if err != nil {
		return s, fmt.Errorf("copying io: %w", err)
	}

	return s, nil
}
