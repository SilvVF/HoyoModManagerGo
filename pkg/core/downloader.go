package core

import (
	"context"
	"errors"
	"fmt"
	"hmm/pkg/log"
	"hmm/pkg/pref"
	"hmm/pkg/types"
	"hmm/pkg/util"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"

	"github.com/alitto/pond/v2"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// TODO: auto retry downloads on error

const (
	TYPE_DOWNLOAD = "download"
	TYPE_QUEUED   = "queued"
	TYPE_FINISHED = "finished"
	TYPE_ERROR    = "error"
	TYPE_UNZIP    = "unzip"
)

type DLMeta struct {
	character     string
	characterId   int
	game          types.Game
	gbId          int
	texture       bool
	modId         int
	previewImages []string
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
	count int
	pool  pond.Pool
	Queue ConcurrentMap[string, *DLItem]
	m     sync.Mutex

	spaceSaver pref.Preference[bool]
}

func NewDownloader(db *DbHelper, count pref.Preference[int], spaceSaver pref.Preference[bool]) *Downloader {

	downloader := &Downloader{
		db:         db,
		count:      count.Get(),
		pool:       pond.NewPool(count.Get()),
		Queue:      NewCMap[*DLItem](),
		m:          sync.Mutex{},
		spaceSaver: spaceSaver,
	}

	watcher, _ := count.Watch()

	go func() {
		for {
			v, ok := <-watcher
			if !ok {
				return
			}
			downloader.count = v
			go downloader.restart()
		}
	}()

	return downloader
}

func (d *Downloader) GetQueue() map[string]*DLItem {
	return d.Queue.Items()
}

func (d *Downloader) RemoveFromQueue(key string) {
	d.Queue.Remove(key)
}

func (d *Downloader) DeleteTexture(textureId int) error {
	texture, err := d.db.SelecteTextureById(textureId)
	if err != nil {
		log.LogPrint(err.Error())
		return err
	}
	mod, err := d.db.SelectModById(texture.ModId)
	if err != nil {
		log.LogPrint(err.Error())
		return err
	}
	path := filepath.Join(util.GetModDir(mod), "textures", texture.Filename)
	log.LogPrint(path)
	if err = os.RemoveAll(path); err != nil {
		return err
	}
	return d.db.DeleteTextureById(texture.Id)
}

func (d *Downloader) Delete(modId int) error {
	mod, err := d.db.SelectModById(modId)
	if err != nil {
		log.LogPrint(err.Error())
		return err
	}
	path := filepath.Join(util.GetCharacterDir(mod.Character, mod.Game), mod.Filename)
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
	item, ok := d.Queue.Get(link)
	if !ok {
		return errors.New("item not found")
	}
	d.Queue.Remove(item.Link)
	return d.Download(item.Link, item.Filename, item.meta.character, item.meta.characterId, item.meta.game, item.meta.gbId, item.meta.previewImages)
}

func (d *Downloader) restart() {
	d.m.Lock()
	defer d.m.Unlock()

	d.pool.StopAndWait()
	d.pool = pond.NewPool(d.count)

	for _, item := range d.Queue.Items() {
		if item.State != TYPE_FINISHED {

			item.State = TYPE_QUEUED

			item.Fetch = DataProgress{}
			item.Unzip = DataProgress{}

			d.pool.SubmitErr(func() error {
				return d.internalDonwload(item.Link, item.Filename, item.meta)
			})
		}
	}
}

func (d *Downloader) DownloadTexture(link, filename string, modId, gbId int, previewImages []string) error {
	if _, ok := d.Queue.Get(link); ok {
		return errors.New("already downloading")
	}

	mod, err := d.db.SelectModById(modId)
	if err != nil {
		return err
	}

	meta := DLMeta{
		character:   mod.Character,
		characterId: mod.CharacterId,
		game:        mod.Game,
		gbId:        gbId,
		texture:     true,
		modId:       modId,
	}
	d.Queue.Set(link, &DLItem{
		Filename: filename,
		Link:     link,
		State:    TYPE_QUEUED,
		meta:     meta,
	})

	runtime.EventsEmit(
		d.Ctx,
		"download",
		TYPE_QUEUED,
	)

	if !d.pool.Stopped() {
		d.pool.SubmitErr(func() error {
			return d.internalDonwload(link, filename, meta)
		})
	}

	return nil
}

func (d *Downloader) Download(link, filename, character string, characterId int, game types.Game, gbId int, previewImages []string) error {
	if _, ok := d.Queue.Get(link); ok {
		return errors.New("already downloading")
	}
	meta := DLMeta{
		character:     character,
		characterId:   characterId,
		game:          game,
		gbId:          gbId,
		previewImages: previewImages,
	}
	d.Queue.Set(link, &DLItem{
		Filename: filename,
		Link:     link,
		State:    TYPE_QUEUED,
		meta:     meta,
	})

	runtime.EventsEmit(
		d.Ctx,
		"download",
		TYPE_QUEUED,
	)

	if !d.pool.Stopped() {
		d.pool.Submit(func() {
			d.internalDonwload(link, filename, meta)
		})

	}

	return nil
}

func (d *Downloader) internalDonwload(link, filename string, meta DLMeta) (err error) {
	log.LogPrint(fmt.Sprintf("Downloading %s %d", meta.character, meta.gbId))

	defer func() {
		item, ok := d.Queue.Get(link)
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
		item, ok := d.Queue.Get(link)
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
	var outputDir string
	if meta.texture {
		m, err := d.db.SelectModById(meta.modId)
		if err != nil {
			return err
		}
		outputDir = filepath.Join(util.GetModDir(m), "textures", filename[:dotIdx])
	} else {
		outputDir = filepath.Join(util.GetCharacterDir(meta.character, meta.game), filename[:dotIdx])
	}
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

	if d.spaceSaver.Get() {
		out, err := os.Open(outputDir)
		if err != nil {
			log.LogError(err.Error())
		}
		defer out.Close()
		dir, err := out.Readdir(1)
		if err != nil {
			log.LogError(err.Error())
		} else {
			path := filepath.Join(outputDir, dir[0].Name())
			err = ZipFolder(path)
			if err != nil {
				os.RemoveAll(path)
			}
		}
	}

	if meta.texture {
		d.db.InsertTexture(types.Texture{
			Filename:       filename[:dotIdx],
			Enabled:        false,
			PreviewImages:  meta.previewImages,
			GbId:           meta.gbId,
			ModLink:        link,
			GbFileName:     filename,
			GbDownloadLink: link,
			ModId:          meta.modId,
			Id:             dotIdx,
		})
	} else {
		d.db.InsertMod(types.Mod{
			Filename:       filename[:dotIdx],
			Game:           meta.game,
			Character:      meta.character,
			CharacterId:    meta.characterId,
			PreviewImages:  meta.previewImages,
			Enabled:        false,
			GbId:           meta.gbId,
			ModLink:        link,
			GbFileName:     filename,
			GbDownloadLink: link,
		})
	}
	return err
}
