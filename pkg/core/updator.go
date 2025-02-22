package core

import (
	"context"
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
	"time"
)

const (
	local = 0
	net   = 1
)

type Updator struct {
	api        *api.GbApi
	cancel     context.CancelFunc
	exportDirs map[types.Game]pref.Preference[string]
}

func NewUpdator(api *api.GbApi, dirs map[types.Game]pref.Preference[string]) *Updator {
	return &Updator{
		api:        api,
		exportDirs: dirs,
	}
}

func (u *Updator) CancelJob() {
	if u.cancel != nil {
		u.cancel()
	}
}

func (u *Updator) CheckFixesForUpdate() []types.Update {
	context, cancel := context.WithTimeout(context.Background(), time.Second*15)
	defer cancel()

	if u.cancel != nil {
		u.cancel()
	}
	u.cancel = cancel

	return u.checkFixesForUpdateCancellable(context)
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
		if files != nil && len(files) > 0 {
			removeIfNotOverwritten(filepath.Base(files[0]))
		}
		return err
	default:
		files, err := extract(path, filepath.Dir(path), false, func(progress, total int64) {})
		if files != nil && len(files) > 0 {
			removeIfNotOverwritten(filepath.Base(files[0]))
		}
		return err
	}
}

func (u *Updator) checkFixesForUpdateCancellable(ctx context.Context) []types.Update {

	final := make(chan types.Update, len(types.Games))
	ret := make([]types.Update, len(types.Games))

	for i, game := range types.Games {
		ret[i] = types.Update{Game: game, Found: false}
		go func() {
			res := make(chan Pair[int, any], 2)
			got := make([]Pair[int, any], 0, 2)

			go u.checkLocalForCurrent(game, res)
			go u.checkNetworkForUpdate(game, res)

			for len(got) < 2 {
				select {
				case r := <-res:
					got = append(got, r)
				case <-ctx.Done():
					return
				}
			}

			final <- NewUpdate(got, game)
		}()
	}

	for i := 0; i < len(types.Games); i++ {
		select {
		case u := <-final:
			ret[i] = u
		case <-ctx.Done():
			return ret
		}
	}

	return ret
}

func NewUpdate(pair []Pair[int, any], game types.Game) types.Update {
	var l string
	var n types.Tool
	if pair[0].x == local {
		l = pair[0].y.(string)
		n = pair[1].y.(types.Tool)
	} else {
		l = pair[1].y.(string)
		n = pair[0].y.(types.Tool)
	}
	return types.Update{Found: n.Dl != "", Game: game, Current: l, Newest: n}
}

func (u *Updator) checkLocalForCurrent(game types.Game, res chan<- Pair[int, any]) {
	notfound := Pair[int, any]{local, ""}
	dir, ok := u.exportDirs[types.Game(game)]
	if !ok || !dir.IsSet() {
		res <- notfound
		return
	}
	path := dir.Get()
	file, err := os.Open(path)
	if err != nil {
		log.LogDebug(err.Error())
		res <- notfound
		return
	}
	subdirs, err := file.Readdirnames(-1)
	if err != nil {
		log.LogDebug(err.Error())
		res <- notfound
		return
	}
	res <- Pair[int, any]{local, getModFixExe(subdirs)}
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

func (u *Updator) checkNetworkForUpdate(game types.Game, res chan<- Pair[int, any]) {
	notfound := Pair[int, any]{net, nil}

	id := u.gameToToolId(game)
	if id == -1 {
		res <- notfound
		return
	}
	page, err := u.api.ToolPage(id)
	if err != nil {
		log.LogDebug(err.Error())
		res <- notfound
		return
	}
	for _, file := range page.AFiles {
		if file.BContainsExe == true {
			res <- Pair[int, any]{
				net,
				types.Tool{
					Dl:          file.SDownloadURL,
					Name:        page.SName,
					Description: file.SDescription,
					FName:       file.SFile,
				},
			}
			break
		}
	}
	res <- notfound
}
