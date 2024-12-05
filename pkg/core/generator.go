package core

import (
	"context"
	"errors"
	"fmt"
	"hmm/pkg/log"
	"hmm/pkg/pref"
	"hmm/pkg/types"
	"hmm/pkg/util"
	"io/fs"
	"os"
	"path/filepath"
	"slices"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/alitto/pond/v2"
)

var ErrStopWalkingDirError = errors.New("stop walking normally")

type Generator struct {
	db         *DbHelper
	cancel     map[types.Game]context.CancelFunc
	wg         map[types.Game]*sync.WaitGroup
	mutex      map[types.Game]*sync.Mutex
	outputDirs map[types.Game]pref.Preference[string]
	ignored    pref.Preference[[]string]
}

func NewGenerator(
	db *DbHelper,
	outputDirs map[types.Game]pref.Preference[string],
	ignoredDirPref pref.Preference[[]string],
) *Generator {
	return &Generator{
		db: db,
		cancel: map[types.Game]context.CancelFunc{
			types.Genshin:  func() {},
			types.StarRail: func() {},
			types.ZZZ:      func() {},
			types.WuWa:     func() {},
		},
		wg: map[types.Game]*sync.WaitGroup{
			types.Genshin:  {},
			types.StarRail: {},
			types.ZZZ:      {},
			types.WuWa:     {},
		},
		mutex: map[types.Game]*sync.Mutex{
			types.Genshin:  {},
			types.StarRail: {},
			types.ZZZ:      {},
			types.WuWa:     {},
		},
		outputDirs: outputDirs,
		ignored:    ignoredDirPref,
	}
}

func areModsSame(parts []string) func(m types.Mod) bool {
	return func(m types.Mod) bool {
		prevId, err := strconv.Atoi(parts[0])
		if err != nil {
			return false
		}
		return m.Id == prevId && m.Filename == parts[1]
	}
}

func dateSorter() func(a, b string) int {
	return func(a, b string) int {
		dateA, errA := util.ExtractDateFromFilename(a)
		dateB, errB := util.ExtractDateFromFilename(b)

		if errA != nil || errB != nil {
			return 0
		}
		switch {
		case dateA.Before(dateB):
			return 1
		case dateA.After(dateB):
			return -1
		default:
			return 0
		}
	}
}

func (g *Generator) Reload(game types.Game) error {
	if !g.outputDirs[game].IsSet() {
		return errors.New("output dir not set")
	}

	g.mutex[game].Lock()

	// Cancel any ongoing task
	if g.cancel[game] != nil {
		fmt.Println("Cancelling previous task and waiting for it to finish current step")
		g.cancel[game]()  // Signal cancellation
		g.wg[game].Wait() // Wait for the task to finish its current step
		fmt.Println("Previous task finished its current step")
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	g.cancel[game] = cancel
	errCh := make(chan error, 1)
	g.wg[game].Add(1)

	g.mutex[game].Unlock()

	go func() {
		defer g.wg[game].Done()
		errCh <- moveModsToOutputDir(g, game, ctx)
		close(errCh)
	}()

	select {
	case err := <-errCh:
		return err
	case <-ctx.Done():
		return context.Canceled
	}
}

func moveModsToOutputDir(g *Generator, game types.Game, ctx context.Context) error {

	genPond := pond.NewPool(4)
	defer genPond.StopAndWait()

	isActive := func() error {
		select {
		case <-ctx.Done():
			return context.Canceled
		default:
			return nil
		}
	}

	ignored := g.ignored.Get()
	outputDir := g.outputDirs[game].Get()

	selected, err := g.db.SelectEnabledModsByGame(game)
	if err != nil {
		log.LogError(err.Error())
		return err
	}

	f, err := os.Open(outputDir)
	if err != nil {
		log.LogError(err.Error())
		return err
	}
	defer f.Close()

	exported, err := f.Readdirnames(-1)
	if err != nil {
		log.LogError(err.Error())
		return err
	}

	log.LogDebug(strings.Join(exported, "\n - "))

	exportPool := genPond.NewGroup()
	for _, file := range exported {
		exportPool.Submit(func() {
			if err := isActive(); err != nil {
				return
			}

			stat, err := os.Stat(filepath.Join(outputDir, file))
			if err != nil {
				log.LogDebug("couldnt stat file" + file)
				log.LogError(err.Error())
				return
			}
			if !stat.IsDir() || file == "BufferValues" || slices.Contains(ignored, file) {
				log.LogDebug("skipping file" + file)
				return
			}

			parts := strings.SplitN(file, "_", 2)
			log.LogDebug(strings.Join(parts, ","))

			if len(parts) == 2 {
				enabled := slices.ContainsFunc(selected, areModsSame(parts))
				if !enabled {
					log.LogDebug("Removing" + file)
					err := os.RemoveAll(filepath.Join(outputDir, file))
					if err != nil {
						log.LogError(err.Error())
					}
				}
			} else {
				log.LogDebug("Removing" + file)
				err := os.RemoveAll(filepath.Join(outputDir, file))
				if err != nil {
					log.LogError(err.Error())
				}
			}
		})
	}

	if err := isActive(); err != nil {
		return err
	}

	exportPool.Wait()

	if err := isActive(); err != nil {
		genPond.StopAndWait()
		return err
	}

	modPool := genPond.NewGroup()
	for _, mod := range selected {
		modPool.Submit(func() {
			if err := isActive(); err != nil {
				return
			}

			modDir := util.GetModDir(mod)
			outputDir := filepath.Join(outputDir, fmt.Sprintf("%d_%s", mod.Id, mod.Filename))

			textures, err := g.db.SelectTexturesByModId(mod.Id)

			if err != nil {
				return
			}

			err = copyModWithTextures(
				modDir,
				outputDir,
				len(textures) > 0,
				slices.DeleteFunc(textures, func(e types.Texture) bool {
					return !e.Enabled
				}),
			)
			if err != nil {
				log.LogError(err.Error())
			}

			err = copyKeyMapToMergedIni(modDir, outputDir)
			if err != nil {
				log.LogError(err.Error())
			}
		})
	}

	modPool.Wait()

	if err := isActive(); err != nil {
		genPond.StopAndWait()
		return err
	}

	cmdCtx, cancel := context.WithTimeout(ctx, time.Second*10)
	defer cancel()

	fixExe := getModFixExe(exported)
	cmder := util.NewCmder(filepath.Join(outputDir, fixExe), cmdCtx)
	cmder.SetDir(outputDir)

	if fixExe == "" {
		return errors.New("unable to run mod fix")
	}

	cmder.WithOutFn(func(b []byte) (int, error) {
		value := string(b)
		log.LogDebug(fmt.Sprintf("%s len: %d", value, len(value)))
		if err := isActive(); err != nil || strings.Contains(value, "Done!") || strings.HasSuffix(value, "quit...") {
			log.LogDebug("Cancelling")
			cancel()
		}
		return len(b), nil
	})
	cmder.Run(make([]string, 0))

	return nil
}

func copyKeyMapToMergedIni(modDir, outputDir string) error {
	files, err := os.ReadDir(filepath.Join(modDir, "keymaps"))
	if err != nil {
		return err
	}
	paths := make([]string, 0, len(files))
	for _, file := range files {
		paths = append(paths, file.Name())
	}

	slices.SortFunc(paths, dateSorter())
	if len(paths) > 0 {
		ini, err := os.ReadFile(filepath.Join(modDir, "keymaps", paths[0]))
		if err != nil {
			log.LogDebug(err.Error())
			return err
		}
		err = filepath.WalkDir(outputDir, func(path string, d fs.DirEntry, err error) error {
			if err != nil {
				return err
			}

			if d.IsDir() {
				return nil
			}

			if strings.HasSuffix(d.Name(), ".ini") && !strings.HasPrefix(d.Name(), "DISABLED") {
				// Overwrite the file with new content
				log.LogDebug("Found and overwriting:" + path)
				os.WriteFile(path, ini, os.ModePerm)
				return ErrStopWalkingDirError
			}
			return nil
		})
		if err == ErrStopWalkingDirError {
			return nil
		}
		return err
	}
	return nil
}

func getModFixExe(exported []string) string {
	var fixExe string
	for _, file := range exported {
		if strings.Contains(file, ".exe") {
			if strings.Contains(file, "fix") || strings.Contains(file, "mod") {
				fixExe = file
				break
			} else if fixExe == "" {
				fixExe = file
			}
		}
	}
	return fixExe
}

type Pair[X any, Y any] struct {
	x X
	y Y
}

func copyModWithTextures(
	src string,
	dst string,
	overwrite bool,
	textures []types.Texture,
) error {
	srcInfo, err := os.Stat(src)
	if err != nil {
		return fmt.Errorf("cannot stat source dir: %w", err)
	}
	err = os.MkdirAll(dst, srcInfo.Mode())
	if err != nil {
		return fmt.Errorf("cannot create destination dir: %w", err)
	}

	texturePaths := map[string]Pair[string, string]{}

	for _, t := range textures {
		log.LogDebug("reading dirs for " + t.Filename)
		dirs, err := os.ReadDir(filepath.Join(src, "textures", t.Filename))
		if err != nil {
			log.LogError(err.Error())
			continue
		}
		for _, d := range dirs {
			log.LogPrint("adding to texturePaths: " + d.Name())
			texturePaths[d.Name()] = Pair[string, string]{t.Filename, d.Name()}
		}
	}

	err = filepath.WalkDir(src, func(path string, info os.DirEntry, err error) error {
		if err != nil {
			return err
		}
		relPath, err := filepath.Rel(src, path)
		log.LogDebug(relPath)
		if err != nil {
			return err
		}
		dstPath := filepath.Join(dst, relPath)

		if info.IsDir() {
			if info.Name() == "keymaps" || info.Name() == "textures" {
				log.LogDebug("skipped " + relPath)
				return nil
			}
			if strings.HasPrefix(relPath, "textures\\") || strings.HasPrefix(relPath, "keymaps") {
				log.LogDebug("skipped " + relPath)
				return nil
			}

			return os.MkdirAll(dstPath, info.Type().Perm())
		}

		if filepath.Dir(path) == filepath.Join(src, "keymaps") || strings.HasPrefix(relPath, "textures\\") {
			log.LogDebug("skipped " + relPath)
			return nil
		}

		return util.CopyFile(path, dstPath, overwrite)
	})
	if err != nil {
		return err
	}
	if len(texturePaths) > 0 {
		err = filepath.WalkDir(src, func(path string, info os.DirEntry, err error) error {
			if err != nil {
				return err
			}
			relPath, err := filepath.Rel(src, path)
			if err != nil {
				return err
			}
			dstPath := filepath.Join(dst, relPath)

			t, ok := texturePaths[info.Name()]

			if info.IsDir() && ok {

				if info.Name() == "keymaps" || info.Name() == "textures" {
					log.LogDebug("skipped " + relPath)
					return nil
				}
				if strings.HasPrefix(relPath, "textures\\") || strings.HasPrefix(relPath, "keymaps") {
					log.LogDebug("skipped " + relPath)
					return nil
				}

				log.LogDebug("copy dir to " + dstPath)
				return util.CopyRecursivley(filepath.Join(src, "textures", t.x, t.y), dstPath, true)
			} else if ok {
				if filepath.Dir(path) == filepath.Join(src, "keymaps") || strings.HasPrefix(relPath, "textures\\") {
					log.LogDebug("skipped " + relPath)
					return nil
				}
				log.LogDebug("copy to " + dstPath)
				return util.CopyFile(filepath.Join(src, "textures", t.x, t.y), dstPath, true)
			}
			return nil
		})
	}
	return err
}
