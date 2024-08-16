package core

import (
	"hmm/pkg/api"
	"hmm/pkg/log"
	"hmm/pkg/types"
	"os"
	"path"
	"path/filepath"

	"github.com/sourcegraph/conc/pool"
)

const (
	StartupRequest          = 0
	SyncRequestLocal        = 1
	SyncRequestForceNetwork = 2
)

type SyncRequest int

type SyncHelper struct {
	db              *DbHelper
	running         map[types.Game]*pool.Pool
	initialComplete map[types.Game]bool
	rootDir         string
}

func NewSyncHelper(db *DbHelper) *SyncHelper {

	m := map[types.Game]bool{types.Genshin: false, types.StarRail: false, types.ZZZ: false, types.WuWa: false}
	pools := map[types.Game]*pool.Pool{
		types.Genshin:  pool.New().WithMaxGoroutines(1),
		types.StarRail: pool.New().WithMaxGoroutines(1),
		types.ZZZ:      pool.New().WithMaxGoroutines(1),
		types.WuWa:     pool.New().WithMaxGoroutines(1),
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
	// completed := request == StartupRequest && s.initialComplete[game]

	// if completed {
	// 	return
	// }

	pool := s.running[game]

	pool.Go(func() {

		seenMods := []string{}

		characters := dataApi.Characters()

		for _, c := range characters {

			if c.Id != 0 {
				log.LogPrint("inserting" + c.Name)

				err := s.db.UpsertCharacter(c)

				if err != nil {
					log.LogPrint(err.Error())
				}
			}
		}

		characters = s.db.SelectCharactersByGame(game)

		gameDir := filepath.Join(s.rootDir, game.Name())

		if exist, err := FileExists(gameDir); !exist || err != nil {
			os.MkdirAll(gameDir, os.ModePerm)
		}

		file, err := os.Open(gameDir)
		if err != nil {
			return
		}
		defer file.Close()

		for _, character := range characters {

			charDir := path.Join(gameDir, character.Name)

			if exist, err := FileExists(charDir); !exist || err != nil {
				os.MkdirAll(charDir, os.ModePerm)
			}

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
	})
}
