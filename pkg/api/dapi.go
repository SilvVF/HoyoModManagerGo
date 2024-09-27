package api

import (
	"hmm/pkg/types"
	"hmm/pkg/util"
	"net/http"
	"path"

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
}

var client = http.Client{
	Transport: httpcache.NewTransport(diskcache.New(path.Join(util.GetCacheDir(), "http"))),
}
