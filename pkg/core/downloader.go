package core

import (
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

	"github.com/alitto/pond/v2"
)

const (
	EVENT_DOWNLOAD = "download"
	SIG_QUEUED     = "queued"
	SIG_FINISHED   = "finished"
	SIG_ERROR      = "error"
	STATE_UNZIP    = "unzip"
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
	db         *DbHelper
	emitter    EventEmmiter
	pool       pond.Pool
	Queue      ConcurrentMap[string, *DLItem]
	spaceSaver pref.Preference[bool]
}

func NewDownloader(
	db *DbHelper,
	count pref.Preference[int],
	spaceSaver pref.Preference[bool],
	emmiter EventEmmiter,
) *Downloader {

	d := &Downloader{
		db:         db,
		pool:       pond.NewPool(count.Get()),
		Queue:      NewCMap[*DLItem](),
		spaceSaver: spaceSaver,
		emitter:    emmiter,
	}

	watcher, _ := count.Watch()

	go func() {
		for {
			v, ok := <-watcher
			if !ok {
				return
			}

			d.pool.StopAndWait()
			d.pool = pond.NewPool(v)

			for _, item := range d.Queue.Items() {
				if item.State != SIG_FINISHED {
					d.submitItem(item.Link, item.Filename, item.meta)
				}
			}
		}
	}()

	return d
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
	return d.Download(
		item.Link,
		item.Filename,
		item.meta.character,
		item.meta.characterId,
		item.meta.game,
		item.meta.gbId,
		item.meta.previewImages,
	)
}

func (d *Downloader) submitItem(link, filename string, meta DLMeta) {
	d.Queue.Set(link, &DLItem{
		Filename: filename,
		Link:     link,
		State:    SIG_QUEUED,
		Fetch:    DataProgress{},
		Unzip:    DataProgress{},
		meta:     meta,
	})

	d.emitter.Emit(
		"download",
		SIG_QUEUED,
	)

	if !d.pool.Stopped() {
		d.pool.SubmitErr(func() (err error) {

			defer cleanup(d, link, err)

			switch {
			case filepath.IsAbs(link):
				err = d.localDownload(link, filename, meta)
				return err
			case strings.HasPrefix(link, "https") || strings.HasPrefix(link, "http"):
				err = d.httpDownload(link, filename, meta)
				return err
			default:
				err = errors.New("link was not in a supported format")
				return err
			}
		})
	}
}

func (d *Downloader) DownloadTexture(
	link,
	filename string,
	modId,
	gbId int,
	previewImages []string,
) error {
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

	d.submitItem(link, filename, meta)

	return nil
}

func (d *Downloader) Download(
	link,
	filename,
	character string,
	characterId int,
	game types.Game,
	gbId int,
	previewImages []string,
) error {
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

	d.submitItem(link, filename, meta)

	return nil
}

func cleanup(d *Downloader, link string, err error) {
	item, ok := d.Queue.Get(link)
	if !ok {
		log.LogDebugf("couldnt find item %s %e", link, err)
		return
	}
	if err != nil {
		log.LogError(err.Error())
		item.State = SIG_ERROR
		d.emitter.Emit("download", SIG_ERROR)
	} else {
		log.LogDebugf("finshed downloading %s err %e", link, err)
		item.State = SIG_FINISHED
		d.emitter.Emit("download", SIG_FINISHED)
	}
}

func (d *Downloader) localDownload(link, filename string, meta DLMeta) (err error) {
	log.LogPrint(fmt.Sprintf("Downloading from local source %s %d", meta.character, meta.gbId))
	updateProgress := func(state string, dp DataProgress) {
		item, ok := d.Queue.Get(link)
		if !ok {
			log.LogDebugf("item not in queue %s", link)
			return
		}
		item.State = state
		switch state {
		case EVENT_DOWNLOAD:
			item.Fetch = dp
		case STATE_UNZIP:
			item.Unzip = dp
		}
	}

	file, err := os.Open(link)
	if err != nil {
		log.LogErrorf("failed to open file %s %e", link, err)
		return err
	}
	defer file.Close()

	info, err := file.Stat()

	if err != nil {
		log.LogErrorf("failed to stat file %s %e", link, err)
		return err
	}

	bytes := info.Size()
	log.LogDebugf("read %d bytes from file %s", bytes, link)
	updateProgress(
		EVENT_DOWNLOAD,
		DataProgress{
			Total:    bytes,
			Progress: bytes,
		},
	)

	err = d.unzipAndInsertToDb(filename, link, meta, file, updateProgress)

	if err != nil {
		log.LogDebugf("unzip failed: %e", err)
	}

	return err
}

func (d *Downloader) httpDownload(link, filename string, meta DLMeta) error {
	log.LogPrint(fmt.Sprintf("Downloading from http source %s %d", meta.character, meta.gbId))

	updateProgress := func(state string, dp DataProgress) {
		item, ok := d.Queue.Get(link)
		if !ok {
			return
		}
		item.State = state
		switch state {
		case EVENT_DOWNLOAD:
			item.Fetch = dp
		case STATE_UNZIP:
			item.Unzip = dp
		}
	}

	// Determinate the file size
	resp, err := http.Head(link)
	if err != nil {
		return err
	}
	contentLength := resp.Header.Get("content-length")
	total, err := strconv.Atoi(contentLength)
	if err != nil {
		return err
	}

	res, err := http.Get(link)
	if err != nil {
		return err
	}
	defer res.Body.Close()

	byteCounter := io.TeeReader(res.Body, &countingWriter{
		onProgress: func(p int64) {
			updateProgress(
				EVENT_DOWNLOAD,
				DataProgress{
					Total:    int64(total),
					Progress: p,
				},
			)
		},
	})

	file, err := os.CreateTemp("", "*"+filename)
	if err != nil {
		return err
	}
	if _, err = io.Copy(file, byteCounter); err != nil {
		return err
	}

	defer file.Close()
	defer os.RemoveAll(file.Name())

	err = d.unzipAndInsertToDb(filename, link, meta, file, updateProgress)

	return err
}

func (d *Downloader) unzipAndInsertToDb(
	filename,
	link string,
	meta DLMeta,
	file *os.File,
	updateProgress func(string, DataProgress),
) error {
	dotIdx := strings.LastIndex(filename, ".")
	var outputDir string
	if meta.texture {
		m, err := d.db.SelectModById(meta.modId)
		if err != nil {
			log.LogDebugf("couldnt find mod %d", meta.modId)
			return err
		}
		outputDir = filepath.Join(util.GetModDir(m), "textures", filename[:dotIdx])
	} else {
		outputDir = filepath.Join(util.GetCharacterDir(meta.character, meta.game), filename[:dotIdx])
	}

	log.LogDebugf("set output dir %s", outputDir)

	err := os.MkdirAll(outputDir, 0777)
	if err != nil {
		return err
	}

	onProgress := func(progress int64, total int64) {
		updateProgress(
			STATE_UNZIP,
			DataProgress{
				Progress: progress,
				Total:    total,
			},
		)
	}

	filePath := file.Name()
	switch filepath.Ext(filename) {
	case "":
		log.LogDebug("copying regular file")
		if err = util.CopyRecursivley(filePath, outputDir, true); err != nil {
			return err
		}
	case ".rar":
		log.LogDebug("extracting rar " + filename)
		xFile := &XFile{
			FilePath:  filePath,
			OutputDir: outputDir,
			DirMode:   0777,
			FileMode:  0777,
		}
		if _, _, _, err = extractRAR(xFile, true, onProgress); err != nil {
			return err
		}
	default:
		log.LogDebugf("extracting %s", filepath.Ext(filename))
		if _, err = extract(filePath, outputDir, true, onProgress); err != nil {
			return err
		}
	}

	if d.spaceSaver.Get() {
		out, err := os.Open(outputDir)
		if err != nil {
			return err
		}
		defer out.Close()
		dirs, err := out.Readdir(1)
		if err != nil {
			return err
		}

		path := filepath.Join(outputDir, dirs[0].Name())
		err = ZipFolder(path)
		if err != nil {
			return err
		}
		os.RemoveAll(path)
	}

	if meta.texture {
		log.LogDebug("Inserting texture")
		_, err = d.db.InsertTexture(types.Texture{
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
		log.LogDebug("Inserting mod")
		_, err = d.db.InsertMod(types.Mod{
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
