package core

import (
	"errors"
	"fmt"
	"hmm/pkg/api"
	"hmm/pkg/log"
	"hmm/pkg/pref"
	"hmm/pkg/types"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"slices"
	"strconv"
	"strings"
	"sync"
)

type Updator struct {
	api        *api.GbApi
	exportDirs map[types.Game]pref.Preference[string]
}

func NewUpdator(api *api.GbApi, dirs map[types.Game]pref.Preference[string]) *Updator {
	return &Updator{
		api:        api,
		exportDirs: dirs,
	}
}

func (u *Updator) CheckFixesForUpdate() []types.Update {
	ret := make([]types.Update, len(types.Games))

	wg := sync.WaitGroup{}

	for i, game := range types.Games {
		wg.Add(1)

		var local string
		var network types.Tool
		var nOk bool

		go func() {
			defer wg.Done()

			checkWg := sync.WaitGroup{}
			checkWg.Add(2)

			go func() {
				defer checkWg.Done()
				exePath, _ := u.checkLocalForCurrent(game)
				local = exePath
			}()

			go func() {
				defer checkWg.Done()
				network, nOk = u.checkNetworkForUpdate(game)
			}()

			checkWg.Wait()
		}()

		ret[i] = types.Update{
			Game:    game,
			Current: local,
			Newest:  network,
			Found:   nOk,
		}
	}

	wg.Wait()

	return ret
}

func (u *Updator) DownloadModFix(game types.Game, old, fname, link string) error {
	outputDir, ok := u.exportDirs[game]
	if !ok {
		return errors.New("output dir not set")
	}

	res, err := http.Get(link)
	if err != nil {
		return err
	}
	defer res.Body.Close()

	ext := filepath.Ext(fname)
	if ext != ".exe" && !slices.Contains([]string{".zip", ".rar", ".7z"}, ext) {
		return errors.New("file is not an executable")
	}

	path := filepath.Join(outputDir.Get(), fname)
	// the file is truncated by default
	file, err := os.Create(path)
	if err != nil {
		return err
	}
	if _, err = io.Copy(file, res.Body); err != nil {
		return err
	}
	file.Close()

	removeIfNotOverwritten := func(newFile string) {
		// if they are the same extraction would have overwritten
		// dont want to delete the file that was just extracted
		log.LogDebug(old)
		log.LogDebug(newFile)
		if old != newFile {
			os.Remove(filepath.Join(outputDir.Get(), old))
		}
	}

	switch filepath.Ext(file.Name()) {
	case ".exe":
		removeIfNotOverwritten(file.Name())
		return err
	case ".rar":
		_, files, _, err := extractRAR(&XFile{
			FilePath:  path,
			OutputDir: filepath.Dir(path),
			FileMode:  os.ModePerm,
			DirMode:   os.ModePerm,
		}, false, func(progress, total int64) {})
		if len(files) > 0 {
			removeIfNotOverwritten(filepath.Base(files[0]))
		}
		return err
	default:
		files, err := extract(path, filepath.Dir(path), false, func(progress, total int64) {})
		if len(files) > 0 {
			removeIfNotOverwritten(filepath.Base(files[0]))
		}
		return err
	}
}

func (u *Updator) checkLocalForCurrent(game types.Game) (string, bool) {
	dir, ok := u.exportDirs[types.Game(game)]
	if !ok || !dir.IsSet() {
		return "", false
	}
	path := dir.Get()
	file, err := os.Open(path)
	if err != nil {
		log.LogDebug(err.Error())
		return "", false
	}
	subdirs, err := file.Readdirnames(-1)
	if err != nil {
		log.LogDebug(err.Error())
		return "", false
	}
	return getModFixExe(subdirs), true
}

func (u *Updator) gameToToolId(game types.Game) int {
	switch game {
	case types.Genshin:
		return 16433
	case types.StarRail:
		return 18925
	case types.ZZZ:
		return 18989
	case types.WuWa:
		records, err := u.api.SubmitterItems(2890460)
		if err != nil {
			log.LogDebug(err.Error())
			return -1
		}
		newest := 0.0
		nid := -1

		for _, record := range records.ARecords {
			if record.SModelName == "Tool" {
				id := record.IDRow
				name := record.SName

				if strings.Contains(name, "Fix") {
					v, err := filterDigits(name)
					if err == nil && v > newest {
						nid = id
						newest = v
					}
				}
			}
		}
		return nid
	}
	return -1
}

func filterDigits(s string) (float64, error) {
	re := regexp.MustCompile(`[-+]?\d*\.?\d+`)
	match := re.FindString(s)
	if match == "" {
		return 0, fmt.Errorf("no number found in string")
	}

	num, err := strconv.ParseFloat(match, 64)
	if err != nil {
		return 0, err
	}
	return num, nil
}

func (u *Updator) checkNetworkForUpdate(game types.Game) (types.Tool, bool) {
	id := u.gameToToolId(game)
	if id == -1 {
		return types.Tool{}, false
	}
	page, err := u.api.ToolPage(id)
	if err != nil {
		log.LogDebug(err.Error())
		return types.Tool{}, false
	}
	for _, file := range page.AFiles {
		if file.BContainsExe {
			tool := types.Tool{
				Dl:          file.SDownloadURL,
				Name:        page.SName,
				Description: file.SDescription,
				FName:       file.SFile,
			}
			return tool, true
		}
	}
	return types.Tool{}, false
}
