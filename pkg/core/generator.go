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
	}

	for _, mod := range selected {

		modDir := util.GetModDir(mod)
		outputDir := filepath.Join(outputDir, fmt.Sprintf("%d_%s", mod.Id, mod.Filename))

		textures, err := g.db.SelectEnabledTexturesByModId(mod.Id)

		if err != nil {
			continue
		}

		err = copyModWithTextures(
			modDir,
			outputDir,
			false,
			textures,
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

		slices.SortFunc(paths, dateSorter())
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

	err = filepath.Walk(src, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		relPath, err := filepath.Rel(src, path)
		if err != nil {
			return err
		}
		dstPath := filepath.Join(dst, relPath)

		// Skip specific directories at root level
		if info.IsDir() {
			if info.Name() == "keymaps" || info.Name() == "textures" {
				return nil
			}
			return os.MkdirAll(dstPath, info.Mode())
		}

		// Skip copying files in the "keymaps" and "textures" directories from src
		if filepath.Dir(path) == filepath.Join(src, "keymaps") || filepath.Dir(path) == filepath.Join(src, "textures") {
			return nil
		}

		// Check if relPath exists in texturePaths
		texture, ok := texturePaths[relPath]
		if ok {
			// Use the path from "textures" instead of "src" for matching entries
			delete(texturePaths, relPath)
			textureSrcPath := filepath.Join(src, "textures", texture.x, texture.y)
			return util.CopyFile(textureSrcPath, dstPath, overwrite)
		}

		// Copy other files from "src"
		return util.CopyFile(path, dstPath, overwrite)
	})

	// Copy remaining items in texturePaths recursively from textures to destination
	for _, v := range texturePaths {
		srcTexturePath := filepath.Join(src, "textures", v.x, v.y)
		err := util.CopyRecursivley(srcTexturePath, dst, true)
		if err != nil {
			return err
		}
	}

	return err
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
