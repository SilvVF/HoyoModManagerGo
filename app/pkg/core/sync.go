package core

import (
	"errors"
	"fmt"
	"hmm/pkg/api"
	"hmm/pkg/core/dbh"
	"hmm/pkg/log"
	"hmm/pkg/types"
	"hmm/pkg/util"
	"os"
	"path/filepath"
	"slices"
	"strings"
	"sync"

	"github.com/alitto/pond/v2"
)

const (
	StartupRequest          SyncRequest = 0
	SyncRequestLocal        SyncRequest = 1
	SyncRequestForceNetwork SyncRequest = 2
	SyncEvent                           = "sync"
)

type SyncRequest int

type SyncHelper struct {
	db              *dbh.DbHelper
	running         map[types.Game]pond.Pool
	initialComplete map[types.Game]*sync.Once
	emitter         EventEmmiter
	notifier        Notifier
}

func (s *SyncHelper) RunAll(request SyncRequest) {
	wg := sync.WaitGroup{}

	for _, game := range types.Games {
		wg.Add(1)

		go func() {
			defer wg.Done()
			if err := s.Sync(game, request); err != nil {
				log.LogError(err.Error())
			}
		}()
	}

	wg.Wait()
}

func NewSyncHelper(db *dbh.DbHelper, emitter EventEmmiter, notifier Notifier) *SyncHelper {
	return &SyncHelper{
		db:       db,
		emitter:  emitter,
		notifier: notifier,
		running: map[types.Game]pond.Pool{
			types.Genshin:  pond.NewPool(1),
			types.StarRail: pond.NewPool(1),
			types.ZZZ:      pond.NewPool(1),
			types.WuWa:     pond.NewPool(1),
		},
		initialComplete: map[types.Game]*sync.Once{
			types.Genshin:  {},
			types.StarRail: {},
			types.ZZZ:      {},
			types.WuWa:     {},
		},
	}
}

func (s *SyncHelper) Sync(game types.Game, request SyncRequest) error {
	dataApi, ok := api.ApiList[game]
	if !ok {
		return fmt.Errorf("invalid data api %v", game)
	}

	if request == StartupRequest {
		s.initialComplete[game].Do(func() {
			s.Sync(game, SyncRequestForceNetwork)
		})
		return nil
	}

	pool := s.running[game]
	if pool.RunningWorkers() > 0 {
		err := errors.New("already running a worker")
		s.notifier.Warn(err)
		return err
	}

	defer s.emitter.Emit(SyncEvent, game, request)

	task := pool.SubmitErr(func() error {

		seenMods := []string{}
		modIdToSeenTextures := map[int][]string{}
		characters, err := s.db.SelectCharactersByGame(game)
		if err != nil {
			return err
		}
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
			return err
		}
		defer file.Close()

		for _, character := range characters {

			if character.Name == "" {
				continue
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
					m, err := s.db.SelectModByFileCharacterGame(mod.Filename, mod.Character, mod.Game)
					mod = m
					if err != nil {
						continue
					}
				}

				modDir := util.GetModDir(mod)
				texturesDir := filepath.Join(modDir, "textures")
				tDirs, err := os.ReadDir(texturesDir)

				if err != nil {
					continue
				}

				for _, tdir := range tDirs {

					if entry, ok := modIdToSeenTextures[mod.Id]; ok {
						modIdToSeenTextures[mod.Id] = append(entry, tdir.Name())
					} else {
						modIdToSeenTextures[mod.Id] = []string{tdir.Name()}
					}
					texture := types.Texture{
						Filename: tdir.Name(),
						ModId:    mod.Id,
					}
					s.db.InsertTexture(texture)
				}
			}
		}

		log.LogPrint("Deleting mods not in: " + strings.Join(seenMods, "\n - "))
		log.LogPrintf("Deleting textures not in: %v", modIdToSeenTextures)

		s.db.DeleteUnusedMods(seenMods, game)
		s.db.DeleteUnusedTextureFromMap(modIdToSeenTextures)

		return nil
	})

	return task.Wait()
}
