package core

import (
	"errors"
	"hmm/pkg/types"
	"hmm/pkg/util"
	"io/fs"
	"path/filepath"
	"strings"
	"sync"

	"gopkg.in/ini.v1"
)

var (
	ErrNotLoaded             = errors.New("mod and config was not found call load first")
	ErrConfigNotFound        = errors.New("config was not found")
	ErrFileFoundShortcircuit = errors.New("found merged.ini file")
	ErrModNotFound           = errors.New("mod was not found")
)

type KeyMapper struct {
	db    *DbHelper
	mutex sync.Mutex

	cfg    *ini.File
	mod    *types.Mod
	keymap []KeyBind
}

type KeyBind struct {
	Name string `json:"name"`
	Key  string `json:"key"`
}

func (k *KeyMapper) Unload() {

	k.mutex.Lock()
	defer k.mutex.Unlock()

	k.mod = nil
	k.keymap = []KeyBind{}
	k.cfg = nil
}

func (k *KeyMapper) GetKeyMap() ([]KeyBind, error) {

	k.mutex.Lock()
	defer k.mutex.Unlock()

	if k.mod == nil || k.cfg == nil {
		return k.keymap, ErrNotLoaded
	}

	return k.keymap, nil
}

func (k *KeyMapper) Load(modId int) error {

	k.mutex.Lock()
	defer k.mutex.Unlock()

	k.cfg = nil
	k.mod = nil

	mod, err := k.db.SelectModById(modId)
	if err != nil {
		return ErrModNotFound
	}
	modDir := util.GetModDir(mod)

	var mergedPath string

	filepath.WalkDir(modDir, func(path string, d fs.DirEntry, err error) error {

		if d.IsDir() || err != nil {
			return nil
		}

		if d.Name() == "merged.ini" {
			mergedPath = path
			return ErrFileFoundShortcircuit
		}
		return nil
	})

	if mergedPath == "" {
		return ErrConfigNotFound
	}

	keybinds := []KeyBind{}
	cfg, err := ini.Load(mergedPath)

	if err != nil {
		return err
	}

	for _, section := range cfg.Sections() {
		// Check if the section name starts with "Key"
		if strings.HasPrefix(section.Name(), "Key") {
			// Check if the section contains a "key" entry
			if key, err := section.GetKey("key"); err == nil {
				keybinds = append(keybinds, KeyBind{
					Name: section.Name(),
					Key:  key.Name(),
				})
			}
		}
	}

	k.mod = &mod
	k.cfg = cfg
	k.keymap = keybinds

	return nil
}
