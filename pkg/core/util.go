package core

import (
	"hmm/pkg/types"
	"os"
	"path/filepath"
)

const (
	APP_NAME = "HoyoModManagerGo"
)

func GetCacheDir() string {

	appData, _ := os.UserCacheDir()

	return filepath.Join(appData, APP_NAME, "cache")
}

func GetCharacterDir(character string, game types.Game) string {
	return filepath.Join(GetGameDir(game), character)
}

func GetGameDir(game types.Game) string {
	return filepath.Join(GetModDir(), game.Name())
}

func GetModDir() string {
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
