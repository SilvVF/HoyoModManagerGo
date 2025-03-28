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

var MetaDataDirs = []string{"keymaps", "textures", "config"}

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

func GetKeyMapsDir(m types.Mod) string {
	return filepath.Join(GetModDir(m), "keymaps")
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

var rootModDirCallback func() string

func SetRootModDirFn(callback func() string) {
	rootModDirCallback = callback
}

func GetRootModDir() string {

	if rootModDirCallback != nil {
		return rootModDirCallback()
	}

	return filepath.Join(GetCacheDir(), "mods")
}

func GetDbFile() string {
	return filepath.Join(GetCacheDir(), "hmm.db")
}

func GetModConfigCache(m types.Mod) string {
	return filepath.Join(GetModDir(m), "config")
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
	parts := strings.Split(filename, "_")
	if len(parts) < 3 {
		return time.Time{}, fmt.Errorf("invalid filename format: %s", filename)
	}
	// "2024-10-17_01-43-33" -> date(len - 2): 2024-10-17   time(len - 1): 01-43-33
	dateStr := parts[len(parts)-2] + "_" + parts[len(parts)-1]
	dateStr = strings.TrimSuffix(dateStr, ".ini")
	parsedTime, err := time.Parse("2006-01-02_15-04-05", dateStr)
	if err != nil {
		return time.Time{}, fmt.Errorf("failed to parse date from filename: %w", err)
	}

	return parsedTime, nil
}

func DirSize(path string) (int64, error) {
	var size int64
	err := filepath.Walk(path, func(_ string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if !info.IsDir() {
			size += info.Size()
		}
		return err
	})
	return size, err
}

func CopyRecursivleyProgFn(src string, dst string, overwrite bool, onProgress func(progress int64, total int64)) error {
	srcInfo, err := os.Stat(src)

	if err != nil {
		return fmt.Errorf("cannot stat source dir: %w", err)
	}

	size, err := DirSize(src)
	if err != nil {
		return err
	}
	total := size
	copy := int64(0)

	onProgress(copy, total)

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

		err = CopyFile(path, dstPath, overwrite)
		if err != nil {
			return err
		}

		copy += info.Size()
		onProgress(copy, total)

		return err
	})

	onProgress(total, total)

	return err
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
