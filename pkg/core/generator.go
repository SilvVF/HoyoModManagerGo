package core

import (
	"errors"
	"fmt"
	"hmm/pkg/log"
	"hmm/pkg/types"
	"os"
	"os/exec"
	"path"
	"slices"
	"strconv"
	"strings"
)

type Generator struct {
	db         *DbHelper
	outputDirs map[types.Game]Preference[string]
	ignored    Preference[[]string]
}

func NewGenerator(
	db *DbHelper,
	outputDirs map[types.Game]Preference[string],
	ignoredDirPref Preference[[]string],
) *Generator {
	return &Generator{
		db:         db,
		outputDirs: outputDirs,
		ignored:    ignoredDirPref,
	}
}

func (g *Generator) Reload(game types.Game) error {

	if !g.outputDirs[game].IsSet() {
		return errors.New("output dir not set")
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

	for _, file := range exported {
		stat, err := os.Stat(path.Join(outputDir, file))
		if err != nil {
			log.LogDebug("couldnt stat file" + file)
			log.LogError(err.Error())
			continue
		}
		if !stat.IsDir() || file == "BufferValues" || slices.Contains(ignored, file) {
			log.LogDebug("skipping file" + file)
			continue
		}

		parts := strings.SplitN(file, "_", 2)
		log.LogDebug(strings.Join(parts, ","))

		if len(parts) == 2 {
			enabled := slices.ContainsFunc(selected, func(e types.Mod) bool {
				prevId, err := strconv.Atoi(parts[0])
				if err != nil {
					return false
				}
				return e.Id == prevId && e.Filename == parts[1]
			})
			if !enabled {
				log.LogDebug("Removing" + file)
				err := os.RemoveAll(path.Join(outputDir, file))
				if err != nil {
					log.LogError(err.Error())
				}
			}
		} else {
			log.LogDebug("Removing" + file)
			err := os.RemoveAll(path.Join(outputDir, file))
			if err != nil {
				log.LogError(err.Error())
			}
		}
	}

	for _, mod := range selected {
		err := CopyRecursivley(GetModDir(mod), path.Join(outputDir, fmt.Sprintf("%d_%s", mod.Id, mod.Filename)), false)
		if err != nil {
			log.LogError(err.Error())
		}
	}

	for _, file := range exported {
		if strings.Contains(file, ".exe") {
			log.LogPrint(fmt.Sprintf("running %s", file))

			cmd := exec.Command("cmd.exe", "/c", fmt.Sprintf("cd %s && start %s", outputDir, file))
			if err = cmd.Run(); err != nil {
				log.LogError(err.Error())
			}
			break
		}
	}

	return nil
}
