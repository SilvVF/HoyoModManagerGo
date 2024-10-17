package core

import (
	"errors"
	"fmt"
	"hmm/pkg/log"
	"hmm/pkg/types"
	"hmm/pkg/util"
	"io/fs"
	"os"
	"os/exec"
	"path/filepath"
	"slices"
	"strconv"
	"strings"
	"time"
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
		stat, err := os.Stat(filepath.Join(outputDir, file))
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
	}

	for _, mod := range selected {
		modDir := util.GetModDir(mod)
		outputDir := filepath.Join(outputDir, fmt.Sprintf("%d_%s", mod.Id, mod.Filename))
		err := util.CopyModWithoutKeymaps(
			modDir,
			outputDir,
			false,
		)

		if err != nil {
			log.LogError(err.Error())
		}

		files, err := os.ReadDir(filepath.Join(modDir, "keymaps"))
		if err != nil {
			continue
		}
		paths := make([]string, 0, len(files))
		for _, file := range files {
			paths = append(paths, file.Name())
		}

		slices.SortFunc(paths, func(a, b string) int {
			dateA, errA := extractDateFromFilename(a)
			dateB, errB := extractDateFromFilename(b)

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
		})
		if len(paths) > 0 {
			ini, err := os.ReadFile(filepath.Join(modDir, "keymaps", paths[0]))
			if err != nil {
				log.LogDebug(err.Error())
				continue
			}
			findAndOverwriteMergedIni(
				outputDir,
				string(ini),
			)
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

func findAndOverwriteMergedIni(dir, newContent string) error {
	// Walk the directory
	err := filepath.WalkDir(dir, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}

		// Check if the file is named "merged.ini"
		if d.IsDir() {
			return nil // Continue if it's a directory
		}

		if d.Name() == "merged.ini" {
			// Overwrite the file with new content
			log.LogDebug("Found and overwriting:" + path)
			os.WriteFile(path, []byte(newContent), os.ModePerm)
			return errors.New("stop walking normally")
		}
		return nil // Continue walking the directory
	})

	return err
}

func extractDateFromFilename(filename string) (time.Time, error) {
	// Split the filename by the underscore
	parts := strings.Split(filename, "_")
	if len(parts) < 3 {
		return time.Time{}, fmt.Errorf("invalid filename format: %s", filename)
	}

	// Extract the date and time part
	dateStr := parts[1] + "_" + parts[2] // e.g., "2024-10-17_01-43-33"

	// Parse the date in the expected format
	parsedTime, err := time.Parse("2006-01-02_15-04-05", dateStr)
	if err != nil {
		return time.Time{}, fmt.Errorf("failed to parse date from filename: %w", err)
	}

	return parsedTime, nil
}
