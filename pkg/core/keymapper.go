package core

import (
	"bufio"
	"errors"
	"fmt"
	"hmm/pkg/log"
	"hmm/pkg/types"
	"hmm/pkg/util"
	"io/fs"
	"os"
	"path/filepath"
	"slices"
	"strings"
	"sync"
	"time"

	"gopkg.in/ini.v1"
)

const (
	dateFormat = "2006-01-02_15-04-05"
)

var (
	ErrNotLoaded             = errors.New("mod and config was not found call load first")
	ErrConfigNotFound        = errors.New("config was not found")
	ErrFileFoundShortcircuit = errors.New("found merged.ini file")
	ErrModNotFound           = errors.New("mod was not found")
)

type KeyBind struct {
	Name string `json:"name"`
	Key  string `json:"key"`
}

type KeyMapper struct {
	db    *DbHelper
	mutex sync.Mutex

	cfg    *ini.File
	path   string
	mod    *types.Mod
	keymap []KeyBind
}

func NewKeymapper(db *DbHelper) *KeyMapper {
	return &KeyMapper{
		db:     db,
		mutex:  sync.Mutex{},
		cfg:    nil,
		path:   "",
		mod:    nil,
		keymap: nil,
	}
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

	return generateKeyBinds(k.cfg), nil
}

func (k *KeyMapper) GetKeymaps() ([]string, error) {
	k.mutex.Lock()
	defer k.mutex.Unlock()

	if k.mod == nil || k.cfg == nil {
		return nil, ErrNotLoaded
	}

	files, err := os.ReadDir(filepath.Join(util.GetModDir(*k.mod), "keymaps"))
	if err != nil {
		return nil, err
	}
	paths := make([]string, 0, len(files))
	for _, file := range files {
		paths = append(paths, file.Name())
	}

	return paths, nil
}

func (k *KeyMapper) SaveConfig() error {
	k.mutex.Lock()
	defer k.mutex.Unlock()

	if k.mod == nil || k.cfg == nil || k.path == "" {
		return ErrNotLoaded
	}
	merged, err := os.Open(k.path)
	if err != nil {
		return err
	}
	defer merged.Close()

	scanner := bufio.NewScanner(merged)
	var iniString strings.Builder
	inConstantsSection := false
	inTargetSection := false

	for scanner.Scan() {
		line := scanner.Bytes()
		str := string(line)

		if inTargetSection {
			if str == "[Present]" {
				k.cfg.WriteTo(&iniString)
				inTargetSection = false
				iniString.WriteString(str)
				iniString.WriteString("\n")
			}
			continue
		}

		if str == "[Constants]" {
			inConstantsSection = true
		}
		if inConstantsSection && len(str) > 0 && str[0] == '[' {
			inTargetSection = true
			inConstantsSection = false
		}

		iniString.WriteString(str)
		iniString.WriteString("\n")
	}

	time := time.Now().Format(dateFormat)
	keymapFile := filepath.Join(
		util.GetModDir(*k.mod),
		"keymaps",
		fmt.Sprintf("keymap_%s.ini", time),
	)
	log.LogDebug(keymapFile)

	err = os.MkdirAll(filepath.Dir(keymapFile), os.ModePerm)
	if err != nil {
		log.LogError("Error creating directories:" + err.Error())
		return err
	}

	output, err := os.Create(keymapFile)
	if err != nil {
		return err
	}
	defer output.Close()

	_, err = output.WriteString(iniString.String())
	return err
}

func (k *KeyMapper) Write(section string, keypress string) error {
	k.mutex.Lock()
	defer k.mutex.Unlock()

	sec, err := k.cfg.GetSection(section)

	if err != nil {
		return err
	}

	key, err := sec.GetKey("key")

	if err != nil {
		return err
	}

	key.SetValue(keypress)

	return err
}

func (k *KeyMapper) Load(modId int) error {

	k.mutex.Lock()
	defer k.mutex.Unlock()

	k.cfg = nil
	k.mod = nil
	k.path = ""

	mod, err := k.db.SelectModById(modId)
	if err != nil {
		log.LogDebug("ERR finding mod" + string(modId) + "in database")
		return ErrModNotFound
	}
	modDir := util.GetModDir(mod)
	filepath.WalkDir(modDir, func(path string, d fs.DirEntry, err error) error {

		if d.IsDir() || err != nil {
			return nil
		}

		if d.Name() == "merged.ini" {
			k.path = path
			return ErrFileFoundShortcircuit
		}
		return nil
	})

	if k.path == "" {
		return ErrConfigNotFound
	}

	files, _ := os.ReadDir(filepath.Join(modDir, "keymaps"))
	paths := make([]string, 0, len(files))
	for _, file := range files {
		paths = append(paths, file.Name())
	}
	slices.SortFunc(paths, func(a, b string) int {
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
	})

	var cfg *ini.File
	configPath := k.path

	if len(paths) > 0 {
		configPath = filepath.Join(modDir, "keymaps", paths[0])
	}
	inputFile, err := os.Open(configPath)
	if err != nil {
		return err
	}
	defer inputFile.Close()

	var constantsSection strings.Builder
	inConstantsSection := false
	inTargetSection := false

	// Iterate through the lines of the INI file
	scanner := bufio.NewScanner(inputFile)
	for scanner.Scan() {
		line := scanner.Bytes() // Read line as bytes
		str := string(line)

		if str == "[Constants]" {
			inConstantsSection = true
			continue
		}

		if str == "[Present]" {
			break // Stop reading further lines
		}

		// Concatenate the line to the section string if we're in the [Constants] section
		if inConstantsSection && len(str) > 0 && str[0] == '[' {
			inTargetSection = true
		}

		if inTargetSection {
			constantsSection.WriteString(str + "\n")
		}
	}

	log.LogDebug(constantsSection.String())
	cfg, err = ini.Load([]byte(constantsSection.String()))
	if err != nil {
		return err
	}

	if err != nil || cfg == nil {
		log.LogDebug("Error loading ini file " + k.path)
		return err
	}
	keybinds := generateKeyBinds(cfg)

	k.mod = &mod
	k.cfg = cfg
	k.keymap = keybinds

	return nil
}

func generateKeyBinds(cfg *ini.File) []KeyBind {
	keybinds := []KeyBind{}
	for _, section := range cfg.Sections() {
		// Check if the section name starts with "Key"
		if strings.HasPrefix(section.Name(), "Key") {
			// Check if the section contains a "key" entry
			if key, err := section.GetKey("key"); err == nil {
				keybinds = append(keybinds, KeyBind{
					Name: section.Name(),
					Key:  key.Value(),
				})
			}
		}
	}
	return keybinds
}

// GPT Generated
var virtualKeys = map[string]int{
	"VK_LBUTTON":   0x01, // Left mouse button
	"VK_RBUTTON":   0x02, // Right mouse button
	"VK_CANCEL":    0x03, // Control-break processing
	"VK_MBUTTON":   0x04, // Middle mouse button
	"VK_XBUTTON1":  0x05, // X1 mouse button
	"VK_XBUTTON2":  0x06, // X2 mouse button
	"VK_BACK":      0x08, // Backspace key
	"VK_TAB":       0x09, // Tab key
	"VK_CLEAR":     0x0C, // Clear key
	"VK_RETURN":    0x0D, // Enter key
	"VK_SHIFT":     0x10, // Shift key
	"VK_CONTROL":   0x11, // Ctrl key
	"VK_MENU":      0x12, // Alt key
	"VK_PAUSE":     0x13, // Pause key
	"VK_CAPITAL":   0x14, // Caps Lock key
	"VK_ESCAPE":    0x1B, // Esc key
	"VK_SPACE":     0x20, // Spacebar
	"VK_PRIOR":     0x21, // Page Up key
	"VK_NEXT":      0x22, // Page Down key
	"VK_END":       0x23, // End key
	"VK_HOME":      0x24, // Home key
	"VK_LEFT":      0x25, // Left arrow key
	"VK_UP":        0x26, // Up arrow key
	"VK_RIGHT":     0x27, // Right arrow key
	"VK_DOWN":      0x28, // Down arrow key
	"VK_SELECT":    0x29, // Select key
	"VK_PRINT":     0x2A, // Print key
	"VK_EXECUTE":   0x2B, // Execute key
	"VK_SNAPSHOT":  0x2C, // Print Screen key
	"VK_INSERT":    0x2D, // Insert key
	"VK_DELETE":    0x2E, // Delete key
	"VK_HELP":      0x2F, // Help key
	"VK_0":         0x30, // 0 key
	"VK_1":         0x31, // 1 key
	"VK_2":         0x32, // 2 key
	"VK_3":         0x33, // 3 key
	"VK_4":         0x34, // 4 key
	"VK_5":         0x35, // 5 key
	"VK_6":         0x36, // 6 key
	"VK_7":         0x37, // 7 key
	"VK_8":         0x38, // 8 key
	"VK_9":         0x39, // 9 key
	"VK_A":         0x41, // A key
	"VK_B":         0x42, // B key
	"VK_C":         0x43, // C key
	"VK_D":         0x44, // D key
	"VK_E":         0x45, // E key
	"VK_F":         0x46, // F key
	"VK_G":         0x47, // G key
	"VK_H":         0x48, // H key
	"VK_I":         0x49, // I key
	"VK_J":         0x4A, // J key
	"VK_K":         0x4B, // K key
	"VK_L":         0x4C, // L key
	"VK_M":         0x4D, // M key
	"VK_N":         0x4E, // N key
	"VK_O":         0x4F, // O key
	"VK_P":         0x50, // P key
	"VK_Q":         0x51, // Q key
	"VK_R":         0x52, // R key
	"VK_S":         0x53, // S key
	"VK_T":         0x54, // T key
	"VK_U":         0x55, // U key
	"VK_V":         0x56, // V key
	"VK_W":         0x57, // W key
	"VK_X":         0x58, // X key
	"VK_Y":         0x59, // Y key
	"VK_Z":         0x5A, // Z key
	"VK_LWIN":      0x5B, // Left Windows key
	"VK_RWIN":      0x5C, // Right Windows key
	"VK_APPS":      0x5D, // Applications key
	"VK_SLEEP":     0x5F, // Sleep key
	"VK_NUMPAD0":   0x60, // Numpad 0 key
	"VK_NUMPAD1":   0x61, // Numpad 1 key
	"VK_NUMPAD2":   0x62, // Numpad 2 key
	"VK_NUMPAD3":   0x63, // Numpad 3 key
	"VK_NUMPAD4":   0x64, // Numpad 4 key
	"VK_NUMPAD5":   0x65, // Numpad 5 key
	"VK_NUMPAD6":   0x66, // Numpad 6 key
	"VK_NUMPAD7":   0x67, // Numpad 7 key
	"VK_NUMPAD8":   0x68, // Numpad 8 key
	"VK_NUMPAD9":   0x69, // Numpad 9 key
	"VK_MULTIPLY":  0x6A, // Numpad Multiply key
	"VK_ADD":       0x6B, // Numpad Add key
	"VK_SEPARATOR": 0x6C, // Numpad Separator key
	"VK_SUBTRACT":  0x6D, // Numpad Subtract key
	"VK_DECIMAL":   0x6E, // Numpad Decimal key
	"VK_DIVIDE":    0x6F, // Numpad Divide key
	"VK_F1":        0x70, // F1 key
	"VK_F2":        0x71, // F2 key
	"VK_F3":        0x72, // F3 key
	"VK_F4":        0x73, // F4 key
	"VK_F5":        0x74, // F5 key
	"VK_F6":        0x75, // F6 key
	"VK_F7":        0x76, // F7 key
	"VK_F8":        0x77, // F8 key
	"VK_F9":        0x78, // F9 key
	"VK_F10":       0x79, // F10 key
	"VK_F11":       0x7A, // F11 key
	"VK_F12":       0x7B, // F12 key
	"VK_NUMLOCK":   0x90, // Num Lock key
	"VK_SCROLL":    0x91, // Scroll Lock key
}
