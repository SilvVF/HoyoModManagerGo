package core

import (
	"errors"
	"fmt"
	"hmm/pkg/log"
	"hmm/pkg/pref"
	"hmm/pkg/types"
	"hmm/pkg/util"
	"io"
	"maps"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"sync"

	"github.com/alitto/pond/v2"
)

const (
	EVENT_DOWNLOAD = "download"
	STATE_QUEUED   = "queued"
	STATE_FINSIHED = "finished"
	STATE_ERROR    = "error"
	STATE_UNZIP    = "unzip"
	STATE_COMPRESS = "compress"
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
	Compress DataProgress `json:"compress"`
	meta     DLMeta
}

type Downloader struct {
	db         *DbHelper
	emitter    EventEmmiter
	pool       pond.Pool
	Queue      map[string]*DLItem
	mutex      sync.RWMutex
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
		Queue:      map[string]*DLItem{},
		mutex:      sync.RWMutex{},
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

			if v == d.pool.MaxConcurrency() {
				continue
			}

			d.pool.StopAndWait()
			d.pool = pond.NewPool(v)

			qCpy := d.GetQueue()
			for _, item := range qCpy {
				if item.State != STATE_FINSIHED && item.State != STATE_ERROR {
					d.Retry(item.Link)
				}
			}

		}
	}()

	return d
}

func (d *Downloader) GetQueue() map[string]*DLItem {
	d.mutex.RLock()
	defer d.mutex.RUnlock()

	cpy := make(map[string]*DLItem, len(d.Queue))

	maps.Copy(cpy, d.Queue)

	return cpy
}

func (d *Downloader) RemoveFromQueue(key string) {

	d.mutex.Lock()
	defer d.mutex.Unlock()

	delete(d.Queue, key)
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

	d.mutex.Lock()

	item, ok := d.Queue[link]
	if !ok {
		return errors.New("item not found")
	}

	delete(d.Queue, item.Link)

	d.mutex.Unlock()

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

func convertDriveLinkToDownload(viewLink string) (string, error) {
	re := regexp.MustCompile(`^https?://drive\.google\.com/file/d/([^/]+)/view`)
	matches := re.FindStringSubmatch(viewLink)
	if len(matches) != 2 {
		return "", fmt.Errorf("invalid Google Drive file URL")
	}
	log.LogDebugf("%v", matches)
	fileID := matches[1]
	log.LogDebug(fileID)
	downloadURL := fmt.Sprintf("https://drive.usercontent.google.com/u/0/uc?id=%s&export=download", fileID)
	return downloadURL, nil
}

func getFilenameFromDriveLink(dlLink string) (string, error) {
	resp, err := http.Get(dlLink)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	cd := resp.Header.Get("Content-Disposition")
	if cd == "" {
		return "", fmt.Errorf("Content-Disposition header not found")
	}

	// Extract filename using regex
	re := regexp.MustCompile(`filename="([^"]+)"`)
	matches := re.FindStringSubmatch(cd)
	if len(matches) < 2 {
		return "", fmt.Errorf("filename not found in Content-Disposition")
	}

	return matches[1], nil
}

func (d *Downloader) submitItem(link, filename string, meta DLMeta) {

	d.mutex.Lock()

	d.Queue[link] = &DLItem{
		Filename: filename,
		Link:     link,
		State:    STATE_QUEUED,
		Fetch:    DataProgress{},
		Unzip:    DataProgress{},
		meta:     meta,
	}

	d.mutex.Unlock()

	d.emitter.Emit(
		"download",
		STATE_QUEUED,
	)

	if !d.pool.Stopped() {
		d.pool.SubmitErr(func() (err error) {

			defer func() {
				cleanup(d, link, err)
			}()

			switch {
			case filepath.IsAbs(link):
				err = d.localDownload(link, filename, meta)
				return err
			case strings.Contains(link, "drive.google") || strings.Contains(link, "drive.usercontent"):
				link, err = convertDriveLinkToDownload(link)
				log.LogDebug(link)
				if err != nil {
					return err
				}

				if filename == "" {
					filename, err = getFilenameFromDriveLink(link)
				}
				log.LogDebug(filename)
				if err != nil {
					return err
				}

				err = d.httpDownload(link, filename, meta)
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
	d.mutex.RLock()
	_, ok := d.Queue[link]
	d.mutex.RUnlock()

	if ok {
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

	d.mutex.RLock()
	_, ok := d.Queue[link]
	d.mutex.RUnlock()

	if ok {
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
	d.mutex.Lock()
	defer d.mutex.Unlock()

	item, ok := d.Queue[link]

	if !ok || item == nil {
		log.LogDebugf("couldnt find item %s %e", link, err)
		return
	}

	if err != nil {
		log.LogError(err.Error())
		item.State = STATE_ERROR
		d.emitter.Emit("download", STATE_ERROR)
	} else {
		log.LogDebugf("finshed downloading %s err %e", link, err)
		item.State = STATE_FINSIHED
		d.emitter.Emit("download", STATE_FINSIHED)
	}
}

func (d *Downloader) localDownload(link, filename string, meta DLMeta) (err error) {
	log.LogPrint(fmt.Sprintf("Downloading from local source %s %d", meta.character, meta.gbId))
	updateProgress := func(state string, dp DataProgress) {
		d.mutex.Lock()
		defer d.mutex.Unlock()

		item, ok := d.Queue[link]

		if !ok ||
			item == nil ||
			item.State == STATE_ERROR || item.State == STATE_FINSIHED {
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

func (d *Downloader) httpDownload(link, filename string, meta DLMeta) (err error) {
	log.LogDebug(fmt.Sprintf("Downloading from http source %s %d", meta.character, meta.gbId))

	updateProgress := func(state string, dp DataProgress) {
		d.mutex.Lock()
		defer d.mutex.Unlock()

		item, ok := d.Queue[link]
		if !ok {
			return
		}
		item.State = state
		switch state {
		case EVENT_DOWNLOAD:
			item.Fetch = dp
		case STATE_UNZIP:
			item.Unzip = dp
		case STATE_COMPRESS:
			item.Compress = dp
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
	defer func() {
		file.Close()
		err := os.RemoveAll(file.Name())
		if err != nil {
			log.LogError(err.Error())
		}
	}()

	if _, err = io.Copy(file, byteCounter); err != nil {
		return err
	}

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
	if dotIdx == -1 {
		dotIdx = len(filename)
	}
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
	outputDir = findUniqueDirName(outputDir)

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

	log.LogDebug(filePath)
	log.LogDebug(filepath.Ext(filePath))

	ext := filepath.Ext(filePath)
	switch {
	case unarrSupported(ext):
		log.LogDebugf("extracting %s", filepath.Ext(filePath))
		if _, err = archiveExtract(filePath, outputDir, true, true, onProgress); err != nil {
			return err
		}
	case ext == "":
		log.LogDebug("copying regular file")
		i, err := file.Stat()
		if err != nil {
			return err
		}

		if i.IsDir() {
			if err = util.CopyRecursivleyProgFn(filePath, filepath.Join(outputDir, filename), true, onProgress); err != nil {
				return err
			}
		} else {
			if err = util.CopyFile(filePath, filepath.Join(outputDir, filename), true); err != nil {
				return err
			}
		}
	default:
		return errors.New("unsupported compression format")
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

		dest := filepath.Join(filepath.Dir(path), filepath.Base(path)+".zip")
		err = ZipFolder(path, dest, func(total, complete int) {
			updateProgress(STATE_COMPRESS, DataProgress{Total: int64(total), Progress: int64(complete)})
		})

		if err != nil {
			return err
		}
		os.RemoveAll(path)
	}

	if meta.texture {
		log.LogDebug("Inserting texture")
		_, err = d.db.InsertTexture(types.Texture{
			Filename:       filepath.Base(outputDir),
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
			Filename:       filepath.Base(outputDir),
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

func unarrSupported(ext string) bool {
	_, exists := unarrExtensions[ext]
	return exists
}

var unarrExtensions = map[string]struct{}{
	".zip":     {},
	".rar":     {},
	".7z":      {},
	".tar":     {},
	".gz":      {},
	".bz2":     {},
	".xz":      {},
	".tar.gz":  {},
	".tar.bz2": {},
	".tar.xz":  {},
	".iso":     {},
	".cab":     {},
	".lzma":    {},
	".cpio":    {},
	".z":       {},
	".lz":      {},
}
