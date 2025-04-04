package api

import (
	"hmm/pkg/log"
	"hmm/pkg/types"
	"hmm/pkg/util"
	"io/fs"
	"net/http"
	"os"
	"path/filepath"
	"slices"
	"time"

	"github.com/gregjones/httpcache"
	"github.com/gregjones/httpcache/diskcache"
)

type DataApi interface {
	SkinId() int
	GetGame() types.Game
	Elements() []string
	Characters() []types.Character
}

var ApiList map[types.Game]DataApi = map[types.Game]DataApi{
	types.Genshin:  NewGenshinApi(),
	types.StarRail: NewStarRailApi(),
	types.ZZZ:      NewZenlessZoneZeroApi(),
	types.WuWa:     NewWutherWavesApi(),
	types.LoL:      NewLeagueApi(),
}

const CacheSizeBytes = 100 * 1024 * 1024 // 100 mb

var client = http.Client{
	Transport: httpcache.NewTransport(diskcache.New(filepath.Join(util.GetCacheDir(), "http"))),
}

func CleanCache() {
	httpCache := filepath.Join(util.GetCacheDir(), "http")
	cf := []types.Pair[string, time.Time]{}
	remaining := int64(CacheSizeBytes)

	weekAgo := time.Now().Add(-7 * 24 * time.Hour)

	filepath.Walk(httpCache, func(path string, info fs.FileInfo, err error) error {

		if err != nil || info.IsDir() {
			return nil
		}

		filePath := filepath.Join(httpCache, info.Name())

		if info.ModTime().Before(weekAgo) {
			log.LogDebug("removing from httpcache: " + info.Name())
			_ = os.Remove(filePath)
			return nil
		}

		log.LogDebug("keeping in httpcache: " + info.Name() + " " + info.ModTime().String())
		remaining -= info.Size()
		cf = append(cf, types.Pair[string, time.Time]{X: filePath, Y: info.ModTime()})

		return nil
	})

	if remaining > int64(float64(CacheSizeBytes)*0.5) && len(cf) > 0 {
		slices.SortStableFunc(cf, func(i, j types.Pair[string, time.Time]) int {
			return i.Y.Compare(j.Y)
		})

		for i := range len(cf) / 2 {
			_ = os.Remove(cf[i].X)
		}
	}
}
