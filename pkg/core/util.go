package core

import (
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
