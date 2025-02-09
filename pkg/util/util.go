package util

import (
	"fmt"
	"hmm/pkg/log"
	"hmm/pkg/types"
	"io"
	"os"
	"path/filepath"
	"strings"
	"time"
)

const (
	APP_NAME = "HoyoModManagerGo"
)

func GetGeneratorCache() string {

	appData, err := os.UserCacheDir()

	if err != nil {
		log.LogErrorf("Couldnt get the cache dir %e", err)
	}

	return filepath.Join(appData, APP_NAME, "cache", "generator")
}

func GetKeybindCache() string {

	appData, _ := os.UserCacheDir()

	return filepath.Join(appData, APP_NAME, "cache", "keybind")
}

func GetPluginDir() string {

	return filepath.Join(GetCacheDir(), "plugins")
}

func GetCacheDir() string {

	appData, err := os.UserCacheDir()

	if err != nil {
		log.LogErrorf("Couldnt get the cache dir %e", err)
	}

	return filepath.Join(appData, APP_NAME, "cache")
}

func GetModDir(m types.Mod) string {
	return filepath.Join(GetCharacterDir(m.Character, m.Game), m.Filename)
}

func GetCharacterDir(character string, game types.Game) string {
	return filepath.Join(GetGameDir(game), character)
}

func GetGameDir(game types.Game) string {
	return filepath.Join(GetRootModDir(), game.Name())
}

func GetRootModDir() string {
	return filepath.Join(GetCacheDir(), "mods")
}

func FileExists(path string) (bool, error) {
	_, err := os.Stat(path)
	if err == nil {
		return true, nil
	}
	if os.IsNotExist(err) {
		return false, nil
	}
	return false, err
}

func CreateFileIfNotExists(path string) {
	if exists, _ := FileExists(path); !exists {
		os.Create(path)
	}
}

func DateSorter(ascending bool) func(a, b string) int {
	return func(a, b string) int {
		dateA, errA := ExtractDateFromFilename(a)
		dateB, errB := ExtractDateFromFilename(b)

		if errA != nil || errB != nil {
			return 0
		}
		switch {
		case dateA.Before(dateB):
			if ascending {
				return -1
			} else {
				return 1
			}
		case dateA.After(dateB):
			if ascending {
				return 1
			} else {
				return -1
			}
		default:
			return 0
		}
	}
}

func ExtractDateFromFilename(filename string) (time.Time, error) {
	// Split the filename by the underscore
	parts := strings.Split(filename, "_")
	if len(parts) < 3 {
		return time.Time{}, fmt.Errorf("invalid filename format: %s", filename)
	}

	// Extract the date and time part
	dateStr := parts[len(parts)-2] + "_" + parts[len(parts)-1] // e.g., "2024-10-17_01-43-33"
	dateStr = strings.TrimSuffix(dateStr, ".ini")
	// Parse the date in the expected format
	parsedTime, err := time.Parse("2006-01-02_15-04-05", dateStr)
	if err != nil {
		return time.Time{}, fmt.Errorf("failed to parse date from filename: %w", err)
	}

	return parsedTime, nil
}

func CopyRecursivley(src string, dst string, overwrite bool) error {
	srcInfo, err := os.Stat(src)
	if err != nil {
		return fmt.Errorf("cannot stat source dir: %w", err)
	}
	err = os.MkdirAll(dst, srcInfo.Mode())
	if err != nil {
		return fmt.Errorf("cannot create destination dir: %w", err)
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

		if info.IsDir() {
			return os.MkdirAll(dstPath, info.Mode())
		}

		return CopyFile(path, dstPath, overwrite)
	})

	return err
}

func CopyFile(src, dst string, overwrite bool) error {

	if _, err := os.Stat(dst); err == nil && !overwrite {
		// File exists and overwrite is false, so skip copying
		return nil
	}

	srcFile, err := os.Open(src)
	if err != nil {
		return fmt.Errorf("cannot open source file: %w", err)
	}
	defer srcFile.Close()

	dstFile, err := os.Create(dst)
	if err != nil {
		return fmt.Errorf("cannot create destination file: %w", err)
	}
	defer dstFile.Close()

	_, err = io.Copy(dstFile, srcFile)
	if err != nil {
		return fmt.Errorf("error copying file: %w", err)
	}
	srcInfo, err := os.Stat(src)
	if err != nil {
		return fmt.Errorf("cannot stat source file: %w", err)
	}
	return os.Chmod(dst, srcInfo.Mode())
}
