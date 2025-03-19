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

type Generator struct {
	db         *DbHelper
	cancelFns  map[types.Game]context.CancelFunc
	wgMap      map[types.Game]*sync.WaitGroup
	mutexMap   map[types.Game]*sync.Mutex
	outputDirs map[types.Game]pref.Preference[string]
	ignored    pref.Preference[[]string]
	cleanDir   pref.Preference[bool]
}

func NewGenerator(
	db *DbHelper,
	outputDirs map[types.Game]pref.Preference[string],
	ignoredDirPref pref.Preference[[]string],
	cleanExportDir pref.Preference[bool],
) *Generator {
	return &Generator{
		db: db,
		cancelFns: map[types.Game]context.CancelFunc{
			types.Genshin:  func() {},
			types.StarRail: func() {},
			types.ZZZ:      func() {},
			types.WuWa:     func() {},
		},
		wgMap: map[types.Game]*sync.WaitGroup{
			types.Genshin:  {},
			types.StarRail: {},
			types.ZZZ:      {},
			types.WuWa:     {},
		},
		mutexMap: map[types.Game]*sync.Mutex{
			types.Genshin:  {},
			types.StarRail: {},
			types.ZZZ:      {},
			types.WuWa:     {},
		},
		outputDirs: outputDirs,
		ignored:    ignoredDirPref,
		cleanDir:   cleanExportDir,
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

func (g *Generator) Reload(game types.Game) error {
	if !g.outputDirs[game].IsSet() {
		return errors.New("output dir not set")
	}

	createGenContext := func() (chan error, context.Context, context.CancelFunc) {
		g.mutexMap[game].Lock()
		defer g.mutexMap[game].Unlock()

		if g.cancelFns[game] != nil {
			g.cancelFns[game]()
			g.wgMap[game].Wait()
		}

		ctx, cancel := context.WithCancel(context.Background())

		g.cancelFns[game] = cancel
		errCh := make(chan error, 1)

		g.wgMap[game].Add(1)

		return errCh, ctx, cancel
	}

	errCh, ctx, cancel := createGenContext()
	defer cancel()

	go func() {
		defer g.wgMap[game].Done()
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
					_, err := strconv.Atoi(parts[0])
					if err != nil && !g.cleanDir.Get() {
						return
					}
					err = os.RemoveAll(filepath.Join(outputDir, file))
					if err != nil {
						log.LogError(err.Error())
					}
				}
			} else if g.cleanDir.Get() {
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
				slices.DeleteFunc(textures, func(e types.Texture) bool {
					return !e.Enabled
				}),
			)
			if err != nil {
				log.LogError(err.Error())
			}

			err = copyKeyMapToMergedIni(mod, outputDir)
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
		if err := isActive(); err != nil || strings.Contains(value, "Done!") || strings.Contains(value, "quit...") {
			log.LogDebug("Cancelling")
			cancel()
		}
		return len(b), nil
	})
	cmder.Run(make([]string, 0))

	return nil
}

func copyKeyMapToMergedIni(m types.Mod, outputDir string) error {

	getMostRecentEnabledKeymap := func() ([]byte, error) {
		keymapDir := util.GetKeyMapsDir(m)
		files, err := os.ReadDir(keymapDir)
		if err != nil {
			return []byte{}, err
		}

		paths := make([]string, 0, len(files))
		for _, file := range files {
			if !strings.HasPrefix(file.Name(), "DISABLED") {
				paths = append(paths, file.Name())
			}
		}
		if len(paths) == 0 {
			return []byte{}, errors.New("no keymaps enabled")
		}

		slices.SortFunc(paths, util.DateSorter(false))

		return os.ReadFile(filepath.Join(keymapDir, paths[0]))
	}

	iniBytes, err := getMostRecentEnabledKeymap()
	if err != nil {
		return err
	}

	err = filepath.WalkDir(outputDir, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}

		if d.IsDir() {
			return nil
		}

		if filepath.Ext(d.Name()) == ".ini" && !strings.HasPrefix(d.Name(), "DISABLED") {
			// Overwrite the file with new content
			log.LogDebug("Found and overwriting:" + path)
			os.WriteFile(path, iniBytes, os.ModePerm)

			return ErrStopWalkingDirError
		}
		return nil
	})

	if err == ErrStopWalkingDirError {
		return nil
	}

	return err
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
	textures []types.Texture,
) error {

	os.MkdirAll(util.GetGeneratorCache(), os.ModePerm)
	defer os.RemoveAll(util.GetGeneratorCache())

	srcInfo, err := os.Stat(src)
	if err != nil {
		return fmt.Errorf("cannot stat source dir: %w", err)
	}
	err = os.MkdirAll(dst, srcInfo.Mode())
	if err != nil {
		return fmt.Errorf("cannot create destination dir: %w", err)
	}

	err = copyAndUnzipSelectedMods(
		src,
		dst,
		len(textures) > 0,
	)

	if err != nil {
		return err
	}

	return overwriteTextures(src, dst, textures)
}

func copyAndUnzipSelectedMods(src, dst string, overwrite bool) error {
	return filepath.WalkDir(src, func(path string, info os.DirEntry, err error) error {
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

		if filepath.Ext(path) == ".zip" {
			_, err := extract(path, strings.TrimSuffix(dstPath, ".zip"), false, nil)
			return err
		}

		return util.CopyFile(path, dstPath, overwrite)
	})
}

func overwriteTextures(src, dst string, textures []types.Texture) error {

	texturePaths := map[string]Pair[string, string]{}

	for _, t := range textures {
		log.LogDebug("reading dirs for " + t.Filename)
		texturePath := filepath.Join(src, "textures", t.Filename)
		dirs, err := os.ReadDir(texturePath)
		if err != nil {
			log.LogError(err.Error())
			continue
		}

		for _, d := range dirs {
			log.LogDebug("dir " + d.Name())
			if filepath.Ext(d.Name()) != ".zip" {
				texturePaths[d.Name()] = Pair[string, string]{texturePath, d.Name()}
				continue
			}
			tmp, err := os.MkdirTemp(util.GetGeneratorCache(), "")
			if err != nil {
				log.LogError(err.Error())
				continue
			}

			log.LogDebug("extracting " + filepath.Join(texturePath, d.Name()) + "to " + tmp)
			_, err = extract(filepath.Join(texturePath, d.Name()), tmp, false, nil)
			if err != nil {
				log.LogError(err.Error())
				continue
			}
			tmpDirs, err := os.ReadDir(tmp)
			if err != nil {
				log.LogError(err.Error())
				continue
			}
			for _, tmpDir := range tmpDirs {
				texturePaths[tmpDir.Name()] = Pair[string, string]{tmp, tmpDir.Name()}
			}
		}
	}

	if len(texturePaths) <= 0 {
		return nil
	}

	log.LogDebugf("%v \nsearching in: %s", texturePaths, dst)

	cpy := [][2]string{}

	err := filepath.WalkDir(dst, func(path string, info os.DirEntry, err error) error {
		if err != nil || !info.IsDir() {
			return err
		}

		t, ok := texturePaths[info.Name()]

		if !ok {
			log.LogDebugf("couldnt find texture for path: %s, name: %s", path, info.Name())
			return nil
		}

		log.LogDebugf("copying %s to %s", filepath.Join(t.x, t.y), path)
		cpy = append(cpy, [2]string{filepath.Join(t.x, t.y), path})
		return nil
	})

	if err != nil {
		return err
	}

	for _, pair := range cpy {
		err := util.CopyRecursivley(pair[0], pair[1], true)
		if err != nil {
			return err
		}
	}
	return nil
}
