package core

import (
	"archive/zip"
	"bufio"
	"errors"
	"fmt"
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
	db    *DbHelper
	mutex *sync.Mutex

	cfg    *ini.File
	path   string
	mod    *types.Mod
	keymap []KeyBind
}

func NewKeymapper(db *DbHelper) *KeyMapper {
	return &KeyMapper{
		db:     db,
		mutex:  &sync.Mutex{},
		cfg:    nil,
		path:   "",
		mod:    nil,
		keymap: nil,
	}
}

func resetState(k *KeyMapper) {
	k.cfg = nil
	k.mod = nil
	k.keymap = []KeyBind{}
	k.path = ""
}

func (k *KeyMapper) Unload() {

	k.mutex.Lock()
	defer k.mutex.Unlock()

	os.RemoveAll(util.GetKeybindCache())

	resetState(k)
}

func (k *KeyMapper) DeleteKeymap(file string) error {

	k.mutex.Lock()
	defer k.mutex.Unlock()

	if k.mod == nil {
		return ErrNotLoaded
	}

	return os.Remove(filepath.Join(util.GetModDir(*k.mod), "keymaps", file))
}

func (k *KeyMapper) GetKeyMap() ([]KeyBind, error) {

	k.mutex.Lock()
	defer k.mutex.Unlock()

	if k.mod == nil || k.cfg == nil {
		return k.keymap, ErrNotLoaded
	}

	return generateKeyBinds(k.cfg), nil
}

func (k *KeyMapper) LoadPrevious(file string) error {
	k.mutex.Lock()
	defer k.mutex.Unlock()

	if k.mod == nil || k.cfg == nil {
		return ErrNotLoaded
	}

	modDir := util.GetModDir(*k.mod)
	path := filepath.Join(modDir, "keymaps", file)
	time := time.Now().Format(dateFormat)

	segs := strings.Split(file, "_")

	if len(segs) == 0 {
		return ErrInvalidConfigName
	}

	name := strings.Join(segs[0:len(segs)-2], "")

	keymapFile := filepath.Join(
		filepath.Dir(path),
		fmt.Sprintf("%s_%s.ini", name, time),
	)

	return os.Rename(path, keymapFile)
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
	slices.SortFunc(paths, util.DateSorter(false))

	return paths, nil
}

func (k *KeyMapper) SaveConfig(name string) error {
	k.mutex.Lock()
	defer k.mutex.Unlock()

	if k.mod == nil || k.cfg == nil || k.path == "" {
		return ErrNotLoaded
	}

	if strings.TrimSpace(name) == "" {
		return ErrInvalidConfigName
	}

	time := time.Now().Format(dateFormat)
	keymapFile := filepath.Join(
		util.GetModDir(*k.mod),
		"keymaps",
		fmt.Sprintf("%s_%s.ini", name, time),
	)
	log.LogDebug(keymapFile)

	err := os.MkdirAll(filepath.Dir(keymapFile), os.ModePerm)
	if err != nil {
		log.LogError("Error creating directories:" + err.Error())
		return err
	}

	output, err := os.Create(keymapFile)
	if err != nil {
		return err
	}
	defer output.Close()

	iniString := appendKeybindsToOriginal(k.path, k.cfg)

	_, err = output.WriteString(iniString)
	return err
}

func (k *KeyMapper) Write(section string, sectionKey string, keys []string) error {
	k.mutex.Lock()
	defer k.mutex.Unlock()

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

	return nil
}

func (k *KeyMapper) Load(modId int) error {
	os.RemoveAll(util.GetKeybindCache())
	os.MkdirAll(util.GetKeybindCache(), os.ModePerm)

	k.mutex.Lock()
	defer k.mutex.Unlock()

	resetState(k)

	mod, err := k.db.SelectModById(modId)
	if err != nil {
		log.LogDebug("ERR finding mod" + fmt.Sprint(modId) + "in database")
		return ErrModNotFound
	}
	modDir := util.GetModDir(mod)

	WalkDirHandleZip(modDir, k)

	if k.path == "" {
		return ErrConfigNotFound
	}

	files, _ := os.ReadDir(filepath.Join(modDir, "keymaps"))
	paths := make([]string, 0, len(files))
	for _, file := range files {
		paths = append(paths, file.Name())
	}
	slices.SortFunc(paths, util.DateSorter(false))
	log.LogDebugf("paths %v", paths)

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

	targetSection := getKeybindSection(inputFile)

	log.LogDebug(targetSection)
	cfg, err = ini.Load([]byte(targetSection))
	if err != nil || cfg == nil {
		return err
	}

	keybinds := generateKeyBinds(cfg)

	k.mod = &mod
	k.cfg = cfg
	k.keymap = keybinds

	return nil
}

func WalkZip(path string) (string, error) {
	if filepath.Ext(path) != ".zip" {
		return "", errors.New("file is not a .zip")
	}
	r, err := zip.OpenReader(path)
	if err != nil {
		return "", err
	}
	defer r.Close()

	for _, f := range r.File {
		info := f.FileInfo()
		if info.IsDir() {
			continue
		} else {
			if filepath.Ext(info.Name()) == ".ini" && !strings.HasPrefix(strings.ToUpper(filepath.Base(info.Name())), "DISABLED") {
				rc, err := f.Open()
				if err != nil {
					return "", err
				}
				defer rc.Close()

				tmp, err := os.CreateTemp(util.GetKeybindCache(), "")
				if err != nil {
					return "", err
				}
				defer tmp.Close()

				_, err = io.Copy(tmp, rc)
				if err != nil {
					os.Remove(tmp.Name())
					return "", err
				}
				log.LogDebug(tmp.Name())
				return tmp.Name(), nil
			}
		}
	}
	return "", errors.New("file not found")
}

func WalkDirHandleZip(modDir string, k *KeyMapper) error {
	return filepath.WalkDir(modDir, func(path string, d fs.DirEntry, err error) error {
		log.LogDebug(path)
		if d.IsDir() || err != nil {
			return nil
		}
		if filepath.Ext(path) == ".zip" {
			tmp, err := WalkZip(path)
			if err != nil {
				log.LogError(err.Error())
				return err
			}
			k.path = tmp
			return ErrFileFoundShortcircuit
		}

		if strings.HasSuffix(d.Name(), ".ini") && !strings.HasPrefix(d.Name(), "DISABLED") {
			k.path = path
			return ErrFileFoundShortcircuit
		}
		return nil
	})
}

func appendKeybindsToOriginal(mergedPath string, cfg *ini.File) string {

	// Open the file
	file, err := os.Open(mergedPath)
	if err != nil {
		fmt.Println("Error opening file:", err)
		return ""
	}
	defer file.Close()

	// Check the file size
	fileInfo, err := file.Stat()
	if err != nil {
		fmt.Println("Error getting file size:", err)
		return ""
	}
	fmt.Println("File size:", fileInfo.Size())

	// Check the starting position
	position, err := file.Seek(0, 1) // Get the current file position
	if err != nil {
		fmt.Println("Error getting file position:", err)
		return ""
	}
	fmt.Println("File starting position:", position)
	reader := bufio.NewReader(file)

	var iniString strings.Builder
	inConstantsSection := false
	inTargetSection := false

	regex := regexp.MustCompile(`\[(\w+)\]`)

	for {
		line, err := reader.ReadString('\n')
		if err != nil {
			if err.Error() != "EOF" {
				fmt.Println("Error reading file:", err)
			}
			iniString.WriteString(line)
			break
		}

		if strings.Contains(line, "[Present]") || inTargetSection && strings.HasPrefix(line, ";") {
			inConstantsSection = false
			inTargetSection = false
			cfg.WriteTo(&iniString)
			iniString.WriteString("\n")
		}

		if inConstantsSection {
			if regex.Match([]byte(line)) {
				inTargetSection = true
			}
		}
		if strings.Contains(line, "[Constants]") {
			inConstantsSection = true
		}

		if !inTargetSection {
			iniString.WriteString(line)
		}
	}
	return iniString.String()
}

func getKeybindSection(r io.Reader) string {
	var targetSection strings.Builder
	inConstantsSection := false
	inTargetSection := false

	// Iterate through the lines of the INI file
	scanner := bufio.NewScanner(r)

	for scanner.Scan() {
		line := scanner.Bytes() // Read line as bytes
		str := string(line)

		if str == "[Constants]" {
			inConstantsSection = true
			continue
		}

		if str == "[Present]" || inTargetSection && strings.HasPrefix(str, ";") {
			break
		}

		// Concatenate the line to the section string if we're in the [Constants] section
		if inConstantsSection && len(str) > 0 && str[0] == '[' {
			inTargetSection = true
		}

		if inTargetSection {
			targetSection.WriteString(str + "\n")
		}
	}

	return targetSection.String()
}

func generateKeyBinds(cfg *ini.File) []KeyBind {
	keybinds := []KeyBind{}
	for _, section := range cfg.Sections() {
		// Check if the section name starts with "Key"
		if strings.HasPrefix(section.Name(), "Key") {
			// Check if the section contains a "key" entry

			if key, err := section.GetKey("Back"); err == nil {
				keybinds = append(keybinds, KeyBind{
					Name:       section.Name(),
					SectionKey: "Back",
					Key:        key.Value(),
				})
			}
			if key, err := section.GetKey("back"); err == nil {
				keybinds = append(keybinds, KeyBind{
					Name:       section.Name(),
					SectionKey: "back",
					Key:        key.Value(),
				})
			}
			if key, err := section.GetKey("Key"); err == nil {
				keybinds = append(keybinds, KeyBind{
					Name:       section.Name(),
					SectionKey: "Key",
					Key:        key.Value(),
				})
			}
			if key, err := section.GetKey("key"); err == nil {
				keybinds = append(keybinds, KeyBind{
					Name:       section.Name(),
					SectionKey: "key",
					Key:        key.Value(),
				})
			}
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
