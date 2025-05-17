package core

import (
	"bufio"
	"context"
	"errors"
	"fmt"
	"hmm/pkg/core/dbh"
	"hmm/pkg/log"
	"hmm/pkg/types"
	"hmm/pkg/util"
	"io"
	"io/fs"
	"os"
	"path/filepath"
	"regexp"
	"slices"
	"strings"
	"sync"
	"time"

	"github.com/mholt/archives"

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
	ErrInvalidConfigName     = errors.New("config name was invalid")
)

type KeyBind struct {
	Name       string `json:"name"`
	SectionKey string `json:"sectionKey"`
	Key        string `json:"key"`
}

type KeyMapper struct {
	db    *dbh.DbHelper
	mutex *sync.Mutex

	loaded bool
	mod    types.Mod

	fsys   fs.FS
	ctx    context.Context
	cancel context.CancelFunc

	currentPath string
	iniPath     string
	cfg         *ini.File
	keymap      map[string][]KeyBind
}

func NewKeymapper(db *dbh.DbHelper) *KeyMapper {
	return &KeyMapper{
		db:     db,
		mutex:  &sync.Mutex{},
		cfg:    nil,
		fsys:   nil,
		keymap: make(map[string][]KeyBind, 0),
	}
}

func resetState(k *KeyMapper) {

	if k.cancel != nil {
		k.cancel()
	}

	k.loaded = false
	k.cfg = nil
	k.mod = types.Mod{}
	k.keymap = make(map[string][]KeyBind, 0)
	k.fsys = nil
	k.ctx = nil
	k.cancel = nil
	k.iniPath = ""
}

// clears the keybind cache and resets state
func (k *KeyMapper) Unload() {

	k.mutex.Lock()
	defer k.mutex.Unlock()

	if !k.loaded {
		return
	}

	os.RemoveAll(util.GetKeybindCache())

	resetState(k)
}

// Disables all keymaps and sets cfg and keybinds to merged.ini from mod
func (k *KeyMapper) LoadDefault() error {
	k.mutex.Lock()
	defer k.mutex.Unlock()

	if !k.loaded {
		return ErrNotLoaded
	}

	k.DisableAllExcept()

	return k.loadIni(k.iniPath)
}

func (k *KeyMapper) DeleteKeymap(file string) error {
	k.mutex.Lock()
	defer k.mutex.Unlock()

	if !k.loaded {
		return ErrNotLoaded
	}

	return os.Remove(filepath.Join(util.GetKeyMapsDir(k.mod), file))
}

// returns the current keymap slice for the cfg in memory
func (k *KeyMapper) GetKeyMap() ([]KeyBind, error) {
	k.mutex.Lock()
	defer k.mutex.Unlock()

	if !k.loaded {
		return make([]KeyBind, 0), ErrNotLoaded
	}

	keymap, ok := k.keymap[k.currentPath]

	if !ok {
		return make([]KeyBind, 0), ErrNotLoaded
	}

	return keymap, nil
}

// load a keymap by filename from mods keymap dir
// marks others as disabled
func (k *KeyMapper) LoadPrevious(file string) error {
	k.mutex.Lock()
	defer k.mutex.Unlock()

	if !k.loaded {
		return ErrNotLoaded
	}

	keymaps := util.GetKeyMapsDir(k.mod)
	old := filepath.Join(keymaps, file)
	newFile := strings.TrimPrefix(file, "DISABLED")
	new := filepath.Join(keymaps, newFile)

	if err := os.Rename(old, new); err != nil {
		return err
	}

	if err := k.DisableAllExcept(newFile); err != nil {
		return err
	}

	k.currentPath = new

	return k.loadIni(new)
}

// returns all keymap file paths from mods keymap dir
func (k *KeyMapper) GetKeymaps() ([]string, error) {
	k.mutex.Lock()
	defer k.mutex.Unlock()

	if !k.loaded {
		return nil, ErrNotLoaded
	}

	files, err := os.ReadDir(util.GetKeyMapsDir(k.mod))
	if err != nil {
		return nil, err
	}

	paths := make([]string, 0, len(files))
	for _, file := range files {
		paths = append(paths, file.Name())
	}
	slices.SortFunc(paths, func(a string, b string) int {
		aDisabled := strings.HasPrefix(a, "DISABLED")
		bDisabled := strings.HasPrefix(b, "DISABLED")
		if aDisabled && !bDisabled {
			return 1
		} else if bDisabled && !aDisabled {
			return -1
		}

		return util.DateSorter(false)(a, b)
	})

	return paths, nil
}

// write current cfg and copies sections into original ini of mod
// saves output to mod keymap dir
func (k *KeyMapper) SaveConfig(name string) error {
	k.mutex.Lock()
	defer k.mutex.Unlock()

	if !k.loaded {
		return ErrNotLoaded
	}

	if strings.TrimSpace(name) == "" {
		return ErrInvalidConfigName
	}

	k.DisableAllExcept()

	time := time.Now().Format(dateFormat)
	keymapFile := filepath.Join(
		util.GetKeyMapsDir(k.mod),
		fmt.Sprintf("%s_%s.ini", name, time),
	)
	log.LogDebug(keymapFile)

	err := os.MkdirAll(filepath.Dir(keymapFile), os.ModePerm)
	if err != nil {
		log.LogErrorf("Error creating directories: %e", err)
		return err
	}

	output, err := os.Create(keymapFile)
	if err != nil {
		return err
	}
	defer output.Close()

	f, err := k.fsys.Open(k.iniPath)
	if err != nil {
		return err
	}
	defer f.Close()

	iniString, err := OverwriteIniFiles(f, k.cfg)
	if err != nil {
		return err
	}

	_, err = output.WriteString(iniString)

	if err != nil {
		os.Remove(keymapFile)
		return err
	}

	return nil
}

// appends DISABLED to all files in current mods keymap dir
// exceptions specified using filename only
func (k *KeyMapper) DisableAllExcept(exceptions ...string) error {
	if !k.loaded {
		return ErrModNotFound
	}

	keymaps := util.GetKeyMapsDir(k.mod)
	fe, err := os.ReadDir(keymaps)
	if err != nil {
		return err
	}

	errs := []error{}

	for _, e := range fe {
		if !slices.Contains(exceptions, e.Name()) && !strings.HasPrefix(e.Name(), "DISABLED") {

			absPath := filepath.Join(keymaps, e.Name())

			err := os.Rename(absPath, filepath.Join(keymaps, "DISABLED"+e.Name()))
			if err != nil {
				errs = append(errs, err)
			}
		}
	}

	return errors.Join(errs...)
}

// Writes config and updates k.keybinds with new key
// mutex locked on enter unlock on exit
func (k *KeyMapper) Write(section string, sectionKey string, keys []string) error {
	k.mutex.Lock()
	defer k.mutex.Unlock()

	if !k.loaded {
		return ErrModNotFound
	}

	sec, err := k.cfg.GetSection(section)

	if err != nil {
		return err
	}

	key, err := sec.GetKey(sectionKey)

	if err != nil {
		return err
	}

	binds := make([]string, 0, len(keys))

	for _, k := range keys {
		var bind string
		code, codeOk := KeyCodeMap[k]
		vkcode, vkOk := GetVirtualKey(code)
		if vkOk {
			vkname := VirtualKeyNames[vkcode]
			bind = vkname
		}
		if codeOk && bind == "" {
			bind = k
		}
		if bind == "" {
			return errors.New("invalid keycode " + fmt.Sprint(k))
		}
		binds = append(binds, bind)
	}

	key.SetValue(strings.Join(binds, " "))
	k.keymap[k.currentPath] = generateKeyBinds(k.cfg)

	return nil
}

// sets initial values for keybinds and finds
// original ini file in the mod
func (k *KeyMapper) Load(modId int) error {

	k.mutex.Lock()
	defer k.mutex.Unlock()

	if k.mod.Id == modId {
		return nil
	}

	resetState(k)

	err := os.MkdirAll(util.GetKeybindCache(), os.ModePerm)
	if err != nil {
		return err
	}

	mod, err := k.db.SelectModById(modId)
	if err != nil {
		log.LogDebug("ERR finding mod" + fmt.Sprint(modId) + "in database")
		return ErrModNotFound
	}

	modArchive, err := util.GetModArchive(mod)
	if err != nil {
		return err
	}

	k.ctx, k.cancel = context.WithCancel(context.Background())

	fsys, err := archives.FileSystem(k.ctx, modArchive, nil)
	if err != nil {
		return err
	}
	k.fsys = fsys

	if found, err := findIniFilesForMod(k.fsys); err != nil || len(found) == 0 {
		return errors.New("no ini files found for mod")
	} else {
		log.LogDebugf("found %v", found)
		k.iniPath = found[0]
		k.currentPath = found[0]
	}

	if enabled, ok := GetEnabledKeymapPath(mod); ok {
		k.currentPath = enabled
	}

	k.mod = mod
	k.loaded = true
	k.loadIni(k.currentPath)

	return nil
}

func (k *KeyMapper) loadIni(path string) error {
	inputFile, err := k.fsys.Open(path)
	if err != nil {
		log.LogErrorf("failed to load ini file %s %e", path, err)
		return err
	}
	targetSection := getKeybindSection(inputFile)
	inputFile.Close()

	log.LogDebug("found target section \n" + targetSection)

	cfg, err := ini.Load([]byte(targetSection))
	if err != nil || cfg == nil {
		return err
	}

	k.currentPath = path
	k.cfg = cfg
	k.keymap[path] = generateKeyBinds(cfg)

	return nil
}

// abs path to the keymap enabled for mod
// if no ini enabled path = "" and flag is false
func GetEnabledKeymapPath(mod types.Mod) (string, bool) {

	keymapDir := util.GetKeyMapsDir(mod)

	os.MkdirAll(keymapDir, os.ModePerm)
	files, _ := os.ReadDir(keymapDir)

	paths := make([]string, 0, len(files))
	for _, file := range files {
		if strings.HasPrefix("DISABLED", file.Name()) {
			continue
		}
		paths = append(paths, file.Name())
	}

	if len(paths) == 0 {
		return "", false
	}

	slices.SortFunc(paths, util.DateSorter(false))

	return filepath.Join(keymapDir, paths[0]), true
}

func findIniFilesForMod(fsys fs.FS) ([]string, error) {
	found := []string{}

	err := fs.WalkDir(fsys, ".", func(path string, d fs.DirEntry, err error) error {
		if err != nil || d.IsDir() {
			return nil
		}

		log.LogDebugf("walking dir %s", d.Name())
		basePath := filepath.Base(d.Name())
		if d.IsDir() {
			return nil
		}

		if filepath.Ext(basePath) == ".ini" && !strings.HasPrefix(strings.ToUpper(basePath), "DISABLED") {
			found = append(found, path)
			return nil
		}
		return nil
	})

	return found, err
}

var secRegex = regexp.MustCompile(`\[(.*?)\]`)

func getKeybindSection(r io.Reader) string {

	keySecRegex := regexp.MustCompile(`\[(Key\w*)\]`)

	scanner := bufio.NewScanner(r)
	sb := strings.Builder{}

	for scanner.Scan() {
		line := scanner.Text()

		if keySecRegex.MatchString(line) {

			sb.WriteString(line)
			sb.WriteRune('\n')

			for scanner.Scan() {
				subline := scanner.Text()
				split := strings.Split(subline, "=")

				sb.WriteString(subline)
				sb.WriteRune('\n')

				if len(split) <= 1 {
					break
				}
			}
		}
	}

	return sb.String()
}

func generateKeyBinds(cfg *ini.File) []KeyBind {
	keybinds := []KeyBind{}
	for _, section := range cfg.Sections() {

		if !strings.HasPrefix(section.Name(), "Key") {
			continue
		}

		for _, key := range section.Keys() {
			keybinds = append(keybinds, KeyBind{
				Name:       section.Name(),
				SectionKey: key.Name(),
				Key:        key.Value(),
			})
		}
	}
	return keybinds
}

var KeyCodeMap = map[string]int{
	// Letters
	"a": 65, "A": 65,
	"b": 66, "B": 66,
	"c": 67, "C": 67,
	"d": 68, "D": 68,
	"e": 69, "E": 69,
	"f": 70, "F": 70,
	"g": 71, "G": 71,
	"h": 72, "H": 72,
	"i": 73, "I": 73,
	"j": 74, "J": 74,
	"k": 75, "K": 75,
	"l": 76, "L": 76,
	"m": 77, "M": 77,
	"n": 78, "N": 78,
	"o": 79, "O": 79,
	"p": 80, "P": 80,
	"q": 81, "Q": 81,
	"r": 82, "R": 82,
	"s": 83, "S": 83,
	"t": 84, "T": 84,
	"u": 85, "U": 85,
	"v": 86, "V": 86,
	"w": 87, "W": 87,
	"x": 88, "X": 88,
	"y": 89, "Y": 89,
	"z": 90, "Z": 90,

	// Numbers
	"0": 48, ")": 48,
	"1": 49, "!": 49,
	"2": 50, "@": 50,
	"3": 51, "#": 51,
	"4": 52, "$": 52,
	"5": 53, "%": 53,
	"6": 54, "^": 54,
	"7": 55, "&": 55,
	"8": 56, "*": 56,
	"9": 57, "(": 57,

	// Special Keys
	"Backspace":  8,
	"Tab":        9,
	"Enter":      13,
	"Shift":      16,
	"Control":    17,
	"Alt":        18,
	"Pause":      19,
	"CapsLock":   20,
	"Escape":     27,
	"Space":      32,
	"PageUp":     33,
	"PageDown":   34,
	"End":        35,
	"Home":       36,
	"ArrowLeft":  37,
	"Left":       37,
	"ArrowUp":    38,
	"Up":         38,
	"ArrowRight": 39,
	"Right":      39,
	"ArrowDown":  40,
	"Down":       40,
	"Insert":     45,
	"Delete":     46,

	// Function Keys
	"F1":  112,
	"F2":  113,
	"F3":  114,
	"F4":  115,
	"F5":  116,
	"F6":  117,
	"F7":  118,
	"F8":  119,
	"F9":  120,
	"F10": 121,
	"F11": 122,
	"F12": 123,

	// Symbols
	";": 186, ":": 186,
	"=": 187, "+": 187,
	",": 188, "<": 188,
	"-": 189, "_": 189,
	".": 190, ">": 190,
	"/": 191, "?": 191,
	"`": 192, "~": 192,
	"[": 219, "{": 219,
	"\\": 220, "|": 220,
	"]": 221, "}": 221,
	"'": 222, "\"": 222,
}

var VirtualKeyMap = map[int]int{
	// Letters (JavaScript keyCode to VK)
	65: 0x41, // A
	66: 0x42, // B
	67: 0x43, // C
	68: 0x44, // D
	69: 0x45, // E
	70: 0x46, // F
	71: 0x47, // G
	72: 0x48, // H
	73: 0x49, // I
	74: 0x4A, // J
	75: 0x4B, // K
	76: 0x4C, // L
	77: 0x4D, // M
	78: 0x4E, // N
	79: 0x4F, // O
	80: 0x50, // P
	81: 0x51, // Q
	82: 0x52, // R
	83: 0x53, // S
	84: 0x54, // T
	85: 0x55, // U
	86: 0x56, // V
	87: 0x57, // W
	88: 0x58, // X
	89: 0x59, // Y
	90: 0x5A, // Z

	// Numbers
	48: 0x30, // 0
	49: 0x31, // 1
	50: 0x32, // 2
	51: 0x33, // 3
	52: 0x34, // 4
	53: 0x35, // 5
	54: 0x36, // 6
	55: 0x37, // 7
	56: 0x38, // 8
	57: 0x39, // 9

	// Function Keys
	112: 0x70, // F1
	113: 0x71, // F2
	114: 0x72, // F3
	115: 0x73, // F4
	116: 0x74, // F5
	117: 0x75, // F6
	118: 0x76, // F7
	119: 0x77, // F8
	120: 0x78, // F9
	121: 0x79, // F10
	122: 0x7A, // F11
	123: 0x7B, // F12

	// Special Keys
	8:  0x08, // BACKSPACE
	9:  0x09, // TAB
	13: 0x0D, // ENTER
	16: 0x10, // SHIFT
	17: 0x11, // CTRL
	18: 0x12, // ALT
	19: 0x13, // PAUSE
	20: 0x14, // CAPS LOCK
	27: 0x1B, // ESC
	32: 0x20, // SPACE
	33: 0x21, // PAGE UP
	34: 0x22, // PAGE DOWN
	35: 0x23, // END
	36: 0x24, // HOME
	37: 0x25, // LEFT
	38: 0x26, // UP
	39: 0x27, // RIGHT
	40: 0x28, // DOWN
	45: 0x2D, // INSERT
	46: 0x2E, // DELETE

	// Numpad
	96:  0x60, // NUMPAD 0
	97:  0x61, // NUMPAD 1
	98:  0x62, // NUMPAD 2
	99:  0x63, // NUMPAD 3
	100: 0x64, // NUMPAD 4
	101: 0x65, // NUMPAD 5
	102: 0x66, // NUMPAD 6
	103: 0x67, // NUMPAD 7
	104: 0x68, // NUMPAD 8
	105: 0x69, // NUMPAD 9
	106: 0x6A, // MULTIPLY
	107: 0x6B, // ADD
	109: 0x6D, // SUBTRACT
	110: 0x6E, // DECIMAL
	111: 0x6F, // DIVIDE

	// Symbols
	186: 0xBA, // SEMICOLON
	187: 0xBB, // EQUALS
	188: 0xBC, // COMMA
	189: 0xBD, // MINUS
	190: 0xBE, // PERIOD
	191: 0xBF, // FORWARD SLASH
	192: 0xC0, // BACK QUOTE
	219: 0xDB, // OPEN BRACKET
	220: 0xDC, // BACK SLASH
	221: 0xDD, // CLOSE BRACKET
	222: 0xDE, // SINGLE QUOTE
}

// VirtualKeyNames provides human-readable names for virtual key codes
var VirtualKeyNames = map[int]string{
	0x08: "VK_BACK",
	0x09: "VK_TAB",
	0x0D: "VK_RETURN",
	0x10: "VK_SHIFT",
	0x11: "VK_CONTROL",
	0x12: "VK_MENU", // ALT
	0x13: "VK_PAUSE",
	0x14: "VK_CAPITAL", // CAPS LOCK
	0x1B: "VK_ESCAPE",
	0x20: "VK_SPACE",
	0x25: "VK_LEFT",
	0x26: "VK_UP",
	0x27: "VK_RIGHT",
	0x28: "VK_DOWN",
}

// GetVirtualKey converts a JavaScript keyCode to a Windows Virtual Key code
func GetVirtualKey(keyCode int) (int, bool) {
	vk, exists := VirtualKeyMap[keyCode]
	return vk, exists
}
