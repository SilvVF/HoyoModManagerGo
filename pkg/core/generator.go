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
	for _, file := range exported {
		stat, err := os.Stat(file)
		if err != nil || !stat.IsDir() || file == "BufferValues" || slices.Contains(ignored, file) {
			continue
		}
		parts := strings.SplitN(file, "_", 2)
		if len(parts) == 2 {
			enabled := slices.ContainsFunc(selected, func(e types.Mod) bool {
				prevId, err := strconv.Atoi(parts[0])
				if err != nil {
					return false
				}
				return e.Id == prevId && e.Filename == file
			})
			if !enabled {
				os.RemoveAll(file)
			}
		} else {
			os.RemoveAll(file)
		}
	}

	for _, mod := range selected {
		err := CopyRecursivley(GetModDir(mod), path.Join(outputDir, fmt.Sprintf("%d_%s", mod.Id, mod.Filename)))
		if err != nil {
			log.LogError(err.Error())
		}
	}

	for _, file := range exported {
		if strings.Contains(file, ".exe") {
			log.LogPrint(fmt.Sprintf("running %s", file))

			cmd := exec.Command("cmd.exe", "/c", fmt.Sprintf("cd %s && start /B cmd.exe /c %s && exit", outputDir, file))
			if err = cmd.Run(); err != nil {
				log.LogError(err.Error())
			}
			break
		}
	}

	return nil
}
