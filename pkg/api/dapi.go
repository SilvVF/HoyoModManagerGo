package api

import "hmm/pkg/types"

type DataApi interface {
	SkinId() int
	GetGame() types.Game
	Elements() []string
	Characters() []types.Character
}
