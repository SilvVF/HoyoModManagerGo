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

const (
	EVENT_GEN_STARTED = "gen_started"
)

type Generator struct {
	db           *DbHelper
	poolSize     int
	cancelFns    map[types.Game]types.Pair[context.Context, context.CancelFunc]
	wgMap        map[types.Game]*sync.WaitGroup
	mutexMap     map[types.Game]*sync.Mutex
	outputDirs   map[types.Game]pref.Preference[string]
	ignored      pref.Preference[[]string]
	cleanDir     pref.Preference[bool]
	cs           *ConfigSaver
	eventEmitter EventEmmiter
}

func NewGenerator(
	db *DbHelper,
	outputDirs map[types.Game]pref.Preference[string],
	ignoredDirPref pref.Preference[[]string],
	cleanExportDir pref.Preference[bool],
	eventEmitter EventEmmiter,
) *Generator {
	return &Generator{
		db:       db,
		poolSize: 4,
		cancelFns: map[types.Game]types.Pair[context.Context, context.CancelFunc]{
			types.Genshin:  {},
			types.StarRail: {},
			types.ZZZ:      {},
			types.WuWa:     {},
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
		cs:           NewConfigSaver(outputDirs, db),
		outputDirs:   outputDirs,
		ignored:      ignoredDirPref,
		cleanDir:     cleanExportDir,
		eventEmitter: eventEmitter,
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

func (g *Generator) AwaitCurrentJob(game types.Game) {
	wg, ok := g.wgMap[game]
	if !ok {
		return
	}
	wg.Wait()
}

func (g *Generator) IsRunning(game types.Game) bool {
	ctx, cancel := g.cancelFns[game].Pair()
	if ctx == nil || cancel == nil {
		return false
	}
	return ctx.Err() == nil
}

// unzips mod folders into export dir for given game deleting any
// previous mod files
func (g *Generator) Reload(game types.Game) error {
	if !g.outputDirs[game].IsSet() {
		return errors.New("output dir not set")
	}
	g.eventEmitter.Emit(EVENT_GEN_STARTED, game)

	// cancels the prev job and waits for it to finsih
	// return context and errCh for the created job
	createGenContext := func() (chan error, context.Context, context.CancelFunc) {
		g.mutexMap[game].Lock()
		defer g.mutexMap[game].Unlock()

		_, cancel := g.cancelFns[game].Pair()

		if cancel != nil {
			cancel()
			g.wgMap[game].Wait()
		}

		ctx, cancel := context.WithCancel(context.Background())

		g.cancelFns[game] = types.PairOf(ctx, cancel)
		errCh := make(chan error, 1)

		g.wgMap[game].Add(1)

		return errCh, ctx, cancel
	}

	errCh, ctx, cancel := createGenContext()
	defer cancel()

	go func() {
		defer g.wgMap[game].Done()
		errCh <- g.generateWithContext(game, ctx)
		close(errCh)
	}()

	select {
	case err := <-errCh:
		return err
	case <-ctx.Done():
		return context.Canceled
	}
}

func (g *Generator) generateWithContext(
	game types.Game,
	ctx context.Context,
) error {

	genPond := pond.NewPool(g.poolSize)
	defer genPond.StopAndWait()

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

	// try to save config of current mods before the dir is cleaned
	if _, err := g.cs.saveConfig(game); err != nil {
		log.LogError(err.Error())
	}

	cleanTask := g.cleanOutputDir(
		exported,
		outputDir,
		ignored,
		selected,
		genPond,
		ctx,
	)

	cleanTask.Wait()

	if ctx.Err() != nil {
		genPond.StopAndWait()
		return err
	}

	exportTask := g.copyToOutputDir(selected, outputDir, genPond, ctx)
	exportTask.Wait()

	if ctx.Err() != nil {
		genPond.StopAndWait()
		return err
	}

	err = runModFixExe(ctx, exported, outputDir)

	return err
}

func runModFixExe(ctx context.Context, exported []string, outputDir string) error {
	cmdCtx, cancel := context.WithTimeout(ctx, time.Second*15)
	defer cancel()

	fixExe := getModFixExe(exported)
	cmder := util.NewCmder(filepath.Join(outputDir, fixExe), cmdCtx)
	cmder.SetDir(outputDir)

	if fixExe == "" {
		return errors.New("unable to run mod fix")
	}

	cancelled := false
	cmder.WithOutFn(func(b []byte) (int, error) {
		value := string(b)
		log.LogDebug(fmt.Sprintf("%s len: %d", value, len(value)))
		if strings.Contains(value, "Done!") || strings.Contains(value, "quit...") {
			log.LogDebug("Cancelling")
			cancelled = true
			cancel()
		}
		return len(b), nil
	})

	err := cmder.Run(make([]string, 0))
	if cancelled {
		return nil
	}

	return err
}

// overwrites mods with textures and overwrites merged.ini with saved config and keymaps
func (g *Generator) copyToOutputDir(
	selected []types.Mod,
	outputDir string,
	pond pond.Pool,
	ctx context.Context,
) pond.TaskGroup {
	modPool := pond.NewGroup()
	for _, mod := range selected {
		modPool.Submit(func() {
			if ctx.Err() != nil {
				return
			}

			modDir := util.GetModDir(mod)
			outputDir := filepath.Join(outputDir, fmt.Sprintf("%d_%s", mod.Id, mod.Filename))

			textures, err := g.db.SelectTexturesByModId(mod.Id)
			if err != nil {
				return
			}

			enabledTextures := slices.DeleteFunc(textures, func(e types.Texture) bool { return !e.Enabled })

			err = copyModWithTextures(
				modDir,
				outputDir,
				enabledTextures,
			)

			if err != nil {
				log.LogError(err.Error())
			}

			err = overwriteMergedIniIfneeded(mod, outputDir)
			if err != nil {
				log.LogError(err.Error())
			}
		})
	}
	return modPool
}

// this deletes any files that were not selected but in exported list
// does not overwrite if the mod was already found in exported
func (g *Generator) cleanOutputDir(
	exported []string,
	outputDir string,
	ignored []string,
	selected []types.Mod,
	pond pond.Pool,
	ctx context.Context,
) pond.TaskGroup {
	exportPool := pond.NewGroup()
	for _, file := range exported {
		exportPool.Submit(func() {
			if ctx.Err() != nil {
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

			// delete dir if it matches pattern id_name or clean dir is set
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
	return exportPool
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

	err = copyAndUnzip(
		src,
		dst,
		len(textures) > 0, // TODO check when textures where enabled
	)

	if err != nil {
		return err
	}

	return overwriteTextures(src, dst, textures)
}

func copyAndUnzip(src, dst string, overwrite bool) error {
	return filepath.WalkDir(src, func(path string, info os.DirEntry, err error) error {
		if err != nil {
			return err
		}
		relPath, err := filepath.Rel(src, path)
		if err != nil {
			return err
		}
		dstPath := filepath.Join(dst, relPath)

		if info.IsDir() {
			if slices.Contains(util.MetaDataDirs, info.Name()) {
				return fs.SkipDir
			} else {
				return os.MkdirAll(dstPath, info.Type().Perm())
			}
		} else {
			if filepath.Ext(path) == ".zip" {
				_, err := archiveExtract(path, strings.TrimSuffix(dstPath, ".zip"), false, overwrite, func(progress, total int64) {})
				return err
			} else {
				return util.CopyFile(path, dstPath, overwrite)
			}
		}
	})
}

func overwriteMergedIniIfneeded(m types.Mod, outputDir string) error {
	var iniPath string

	err := filepath.WalkDir(outputDir, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if d.IsDir() {
			return nil
		}
		if filepath.Ext(d.Name()) == ".ini" && !strings.HasPrefix(d.Name(), "DISABLED") {
			log.LogDebug("Found and overwriting:" + path)
			iniPath = path
			return fs.SkipAll
		}
		return nil
	})

	if err != nil {
		return err
	}

	if iniPath == "" {
		return errors.New("ini not found")
	}

	// get the copy from keymaps if it doesnt exist use the original
	enabled, ok := GetEnabledKeymapPath(m)
	if !ok {
		enabled = iniPath
	}
	config, err := GetEnabledConfig(m)

	// no keymaps or config dont need to overwrite anything
	if err != nil && iniPath == enabled {
		return nil
	}

	writeConfigToIni := func() ([]byte, error) {
		f, err := os.Open(enabled)
		if err != nil {
			return make([]byte, 0), err
		}
		defer f.Close()

		s, err := OverwriteIniFiles(f, config)
		if err != nil {
			return make([]byte, 0), err
		}
		return []byte(s), nil
	}

	var b []byte
	if config != nil {
		b, err = writeConfigToIni()
	} else {
		b, err = os.ReadFile(enabled)
	}

	if err != nil {
		return err
	}

	return os.WriteFile(iniPath, b, os.ModePerm)
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

func overwriteTextures(src, dst string, textures []types.Texture) error {

	texturePaths := map[string]types.Pair[string, string]{}

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
				texturePaths[d.Name()] = types.PairOf(texturePath, d.Name())
				continue
			}
			tmp, err := os.MkdirTemp(util.GetGeneratorCache(), "")
			if err != nil {
				log.LogError(err.Error())
				continue
			}

			log.LogDebug("extracting " + filepath.Join(texturePath, d.Name()) + "to " + tmp)
			_, err = archiveExtract(filepath.Join(texturePath, d.Name()), tmp, false, true, func(progress, total int64) {})
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
				texturePaths[tmpDir.Name()] = types.PairOf(tmp, tmpDir.Name())
			}
		}
	}

	if len(texturePaths) <= 0 {
		return nil
	}

	log.LogDebugf("%v \nsearching in: %s", texturePaths, dst)

	srcToDest := []types.Pair[string, string]{}

	err := filepath.WalkDir(dst, func(path string, info os.DirEntry, err error) error {
		if err != nil || !info.IsDir() {
			return err
		}

		t, ok := texturePaths[info.Name()]

		if !ok {
			log.LogDebugf("couldnt find texture for path: %s, name: %s", path, info.Name())
			return nil
		}

		log.LogDebugf("copying %s to %s", filepath.Join(t.X, t.Y), path)
		srcToDest = append(srcToDest, types.PairOf(filepath.Join(t.X, t.Y), path))
		return nil
	})

	if err != nil {
		return err
	}

	for _, pair := range srcToDest {
		src, dest := pair.Pair()
		err := util.CopyRecursivley(src, dest, true)
		if err != nil {
			return err
		}
	}
	return nil
}
