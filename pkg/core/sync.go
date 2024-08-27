package core

import (
	"fmt"
	"hmm/pkg/api"
	"hmm/pkg/log"
	"hmm/pkg/types"
	"os"
	"path"
	"path/filepath"

	"github.com/alitto/pond"
)

const (
	StartupRequest          = 0
	SyncRequestLocal        = 1
	SyncRequestForceNetwork = 2
)

type SyncRequest int

type SyncHelper struct {
	db              *DbHelper
	running         map[types.Game]*pond.WorkerPool
	initialComplete map[types.Game]bool
	rootDir         string
}

func NewSyncHelper(db *DbHelper) *SyncHelper {

	m := map[types.Game]bool{types.Genshin: false, types.StarRail: false, types.ZZZ: false, types.WuWa: false}
	pools := map[types.Game]*pond.WorkerPool{
		types.Genshin:  pond.New(1, 1),
		types.StarRail: pond.New(1, 1),
		types.ZZZ:      pond.New(1, 1),
		types.WuWa:     pond.New(1, 1),
	}

	dir := filepath.Join(GetCacheDir(), "mods")

	return &SyncHelper{
		db:              db,
		running:         pools,
		initialComplete: m,
		rootDir:         dir,
	}
}

func getDataApi(g types.Game) api.DataApi {
	switch g {
	case types.Genshin:
		return &api.GenshinApi{}
	case types.StarRail:
		return &api.StarRailApi{}
	default:
		return &api.GenshinApi{}
	}
}

func (s *SyncHelper) Sync(game types.Game, request SyncRequest) {

	dataApi := getDataApi(game)
	completed := request == StartupRequest && s.initialComplete[game]

	if completed {
		return
	}

	pool := s.running[game]

	if pool.RunningWorkers() > 0 {
		return
	}

	pool.Submit(func() {

		seenMods := []string{}
		characters := s.db.SelectCharactersByGame(game)
		log.LogPrint(fmt.Sprintf("characters size: %d synctype: %d", len(characters), request))

		if len(characters) <= 0 || request == SyncRequestForceNetwork {
			characters = dataApi.Characters()
			for _, c := range characters {

				if c.Id != 0 && c.Name != "" {
					log.LogPrint("inserting " + c.Name)

					err := s.db.UpsertCharacter(c)

					if err != nil {
						log.LogPrint(err.Error())
					}
				}
			}
		}

		gameDir := filepath.Join(s.rootDir, game.Name())
		os.MkdirAll(gameDir, os.ModePerm)

		file, err := os.Open(gameDir)
		if err != nil {
			return
		}
		defer file.Close()

		for _, character := range characters {

			charDir := path.Join(gameDir, character.Name)
			os.MkdirAll(charDir, os.ModePerm)

			file, err := os.Open(charDir)
			if err != nil {
				continue
			}
			defer file.Close()

			modDirs, err := file.Readdirnames(-1)
			if err != nil {
				continue
			}

			for _, modFilename := range modDirs {

				seenMods = append(seenMods, modFilename)

				s.db.InsertMod(types.Mod{
					Filename:    modFilename,
					Game:        game,
					CharacterId: character.Id,
					Character:   character.Name,
					Enabled:     false,
				})
			}
		}

		s.db.DeleteUnusedMods(seenMods, game)
		s.initialComplete[game] = true
	})

}
