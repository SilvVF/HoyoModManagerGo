package api

import "hmm/pkg/types"

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
