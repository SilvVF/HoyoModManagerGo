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

	"github.com/nwaples/rardecode"
	"github.com/wailsapp/wails/v2/pkg/runtime"

	unarr "github.com/gen2brain/go-unarr"
	"golift.io/xtractr"
)

const (
	TYPE_DOWNLOAD = "download"
	TYPE_QUEUED   = "queued"
	TYPE_FINISHED = "finished"
	TYPE_UNZIP    = "unzip"
)

type DLItem struct {
	Filename string       `json:"filename"`
	State    string       `json:"state"`
	Unzip    DataProgress `json:"unzip"`
	Fetch    DataProgress `json:"fetch"`
}

type Downloader struct {
	db    *DbHelper
	Ctx   context.Context
	Queue map[string]DLItem `json:"queue"`
}

func NewDownloader(db *DbHelper) *Downloader {
	return &Downloader{
		db:    db,
		Queue: map[string]DLItem{},
	}
}

func (d *Downloader) GetQueue() map[string]DLItem {
	return d.Queue
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

func (d *Downloader) Donwload(link string, filename string, character string, characterId int, game types.Game, gbId int) (err error) {
	log.LogPrint(fmt.Sprintf("Downloading %s %d", character, game))

	updateProgress := func(state string, dp DataProgress) {
		item, ok := d.Queue[filename]
		if !ok {
			item = DLItem{
				Filename: filename,
				State:    state,
				Unzip:    dp,
				Fetch:    dp,
			}
		}
		item.State = state

		if state == TYPE_QUEUED {
			runtime.EventsEmit(d.Ctx, "download", TYPE_QUEUED)
		} else if state == TYPE_FINISHED {
			runtime.EventsEmit(d.Ctx, "download", TYPE_FINISHED)
		}
		if state == TYPE_DOWNLOAD {
			item.Fetch = dp
		} else if state == TYPE_UNZIP {
			item.Unzip = dp
		}
		d.Queue[filename] = item
	}

	updateProgress(TYPE_QUEUED, DataProgress{})
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
		log.LogPrint(err.Error())
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
		log.LogError(err.Error())
		return err
	}
	if _, err = io.Copy(file, byteCounter); err != nil {
		log.LogError(err.Error())
		return err
	}
	file.Close()
	defer os.Remove(file.Name())

	log.LogDebug("copied file " + filename)

	dotIdx := strings.LastIndex(filename, ".")
	outputDir := path.Join(GetCharacterDir(character, game), filename[:dotIdx])
	os.MkdirAll(outputDir, 0777)

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
		x := &xtractr.XFile{
			FilePath:  filePath,
			OutputDir: outputDir, // do not forget this.
			FileMode:  0777,
			DirMode:   0777,
		}
		if _, _, _, err := extractRAR(x, onProgress); err != nil {
			log.LogError(err.Error())
			return err
		}
	} else {
		log.LogDebug("extracting using unarr " + filename)
		if _, err = extract(filePath, outputDir, onProgress); err != nil {
			return err
		}
	}

	err = d.db.InsertMod(types.Mod{
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

	updateProgress(
		TYPE_FINISHED,
		DataProgress{},
	)

	return err
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

func extractRAR(xFile *xtractr.XFile, onProgress func(progress int64, total int64)) (int64, []string, []string, error) {
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
func clean(x *xtractr.XFile, filePath string, trim ...string) string {
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

func unrar(x *xtractr.XFile, rarReader *rardecode.ReadCloser, onProgress func(progress int64, total int64)) (int64, []string, error) {
	files := []string{}
	size := int64(0)

	var total int64
	if sizeReader, err := rardecode.OpenReader(x.FilePath, x.Password); err != nil {
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
			return size, files, fmt.Errorf("%w: %s", xtractr.ErrInvalidHead, x.FilePath)
		}

		wfile := clean(x, header.Name)
		//nolint:gocritic // this 1-argument filepath.Join removes a ./ prefix should there be one.
		if !strings.HasPrefix(wfile, filepath.Join(x.OutputDir)) {
			// The file being written is trying to write outside of our base path. Malicious archive?
			return size, files, fmt.Errorf("%s: %w: %s != %s (from: %s)",
				x.FilePath, xtractr.ErrInvalidPath, wfile, x.OutputDir, header.Name)
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
		onProgress(size, total)
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
