package core

import (
	"fmt"
	"hmm/pkg/api"
	"hmm/pkg/log"
	"hmm/pkg/types"
	"hmm/pkg/util"
	"os"
	"path/filepath"
	"slices"
	"strings"

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

	return &SyncHelper{
		db:              db,
		running:         pools,
		initialComplete: m,
		rootDir:         util.GetRootModDir(),
	}
}

func (s *SyncHelper) Sync(game types.Game, request SyncRequest) {

	dataApi, ok := api.ApiList[game]
	if !ok {
		return
	}
	completed := request == StartupRequest && s.initialComplete[game]

	if completed {
		log.LogPrint(fmt.Sprintf("completed Startup Sync for game id %s", dataApi.GetGame().Name()))
		return
	}

	pool := s.running[game]

	if pool.RunningWorkers() > 0 {
		return
	}

	pool.Submit(func() {

		seenMods := []string{}
		seenTextures := []Pair[int, string]{}
		characters := s.db.SelectCharactersByGame(game)
		log.LogPrint(fmt.Sprintf("characters size: %d synctype: %d game: %d", len(characters), request, game))

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

		gameDir := util.GetGameDir(game)
		os.MkdirAll(gameDir, 0777)

		file, err := os.Open(gameDir)
		if err != nil {
			return
		}
		defer file.Close()

		for _, character := range characters {

			if character.Name == "" {
				return
			}

			charDir := util.GetCharacterDir(character.Name, game)
			os.MkdirAll(charDir, 0777)

			file, err := os.Open(charDir)
			if err != nil {
				continue
			}
			defer file.Close()

			modDirs, err := file.Readdirnames(-1)
			modDirs = slices.DeleteFunc(modDirs, func(e string) bool { return e == "textures" })

			if err != nil {
				continue
			}

			for _, modFilename := range modDirs {

				seenMods = append(seenMods, modFilename)
				mod := types.Mod{
					Filename:    modFilename,
					Game:        game,
					CharacterId: character.Id,
					Character:   character.Name,
					Enabled:     false,
				}

				modId, err := s.db.InsertMod(mod)
				mod = types.Mod{
					Filename:    modFilename,
					Game:        game,
					CharacterId: character.Id,
					Character:   character.Name,
					Enabled:     false,
					Id:          int(modId),
				}

				if err != nil {
					m, err := s.db.SelectModByCNameAndGame(mod.Filename, mod.Character, mod.Game.Int64())
					mod = m
					if err != nil {
						continue
					}
				}

				modDir := util.GetModDir(mod)
				texturesDir := filepath.Join(modDir, "textures")

				if exists, _ := util.FileExists(texturesDir); exists {
					tDir, err := os.Open(texturesDir)
					if err != nil {
						continue
					}
					tDirs, err := tDir.Readdirnames(-1)
					if err != nil {
						continue
					}
					for _, textureFilename := range tDirs {
						seenTextures = append(seenTextures, Pair[int, string]{mod.Id, textureFilename})
						texture := types.Texture{
							Filename: textureFilename,
							ModId:    mod.Id,
						}
						s.db.InsertTexture(texture)
					}
				}
			}
		}
		log.LogPrint("Deleting mods not in: " + strings.Join(seenMods, "\n - "))
		s.db.deleteUnusedMods(seenMods, game)
		s.db.deleteUnusedTextures(seenTextures)
		s.initialComplete[game] = true
	})

}
