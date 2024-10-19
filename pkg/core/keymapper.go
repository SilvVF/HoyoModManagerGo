package core

import (
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

	time := time.Now().Format(dateFormat)
	keymapFile := filepath.Join(
		util.GetModDir(*k.mod),
		"keymaps",
		fmt.Sprintf("keymap_%s.ini", time),
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

func (k *KeyMapper) Write(section string, keycode int) error {
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

	var bind *string
	vkcode, ok := virtualKeyCodeMap[keycode]
	if ok {
		str, ok := virtualKeysReversed[vkcode]
		if ok {
			bind = &str
		}
	}
	if bind == nil {
		keyname, ok := alphanumericKeyCodeMap[keycode]
		if ok {
			bind = &keyname
		}
	}

	if bind == nil {
		return errors.New("invalid keycode " + fmt.Sprint(keycode))
	}

	key.SetValue(*bind)

	return nil
}

func (k *KeyMapper) Load(modId int) error {

	k.mutex.Lock()
	defer k.mutex.Unlock()

	k.cfg = nil
	k.mod = nil
	k.path = ""

	mod, err := k.db.SelectModById(modId)
	if err != nil {
		log.LogDebug("ERR finding mod" + fmt.Sprint(modId) + "in database")
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
	targetAdded := false

	regex := regexp.MustCompile(`\[(\w+)\]`)

	for {
		line, err := reader.ReadString('\n')
		if err != nil {
			if err.Error() != "EOF" {
				fmt.Println("Error reading file:", err)
			}
			iniString.WriteString(line)
			break // Stop at the end of the file (EOF)
		}

		if line == "[Constants]" {
			inConstantsSection = true
		}

		if inConstantsSection && !targetAdded {
			sections := regex.FindAllStringSubmatch(line, -1)
			if len(sections) > 0 && cfg.HasSection(sections[0][0]) {

				targetAdded = true
				inConstantsSection = false

				iniString.WriteString("\n")
				var str strings.Builder
				cfg.WriteTo(&str)
				iniString.WriteString(str.String())
				continue
			}
		}
		iniString.WriteString(line)
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

		if str == "[Present]" {
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

var virtualKeyCodeMap = map[int]int{

	37: 0x25, // Arrow Left
	38: 0x26, // Arrow Up
	39: 0x27, // Arrow Right
	40: 0x28, // Arrow Down

	8:   0x08, // Backspace
	9:   0x09, // Tab
	13:  0x0D, // Enter
	16:  0x10, // Shift
	17:  0x11, // Control
	18:  0x12, // Alt
	20:  0x14, // Caps Lock
	27:  0x1B, // Escape
	32:  0x20, // Spacebar
	33:  0x22, // Page Up
	34:  0x22, // Page Down
	35:  0x23, // End
	36:  0x24, // Home
	45:  0x2D, // Insert
	46:  0x2E, // Delete
	144: 0x90, // Num Lock

	96:  0x60, // Numpad 0
	97:  0x61, // Numpad 1
	98:  0x62, // Numpad 2
	99:  0x63, // Numpad 3
	100: 0x64, // Numpad 4
	101: 0x65, // Numpad 5
	102: 0x66, // Numpad 6
	103: 0x67, // Numpad 7
	104: 0x68, // Numpad 8
	105: 0x69, // Numpad 9
	106: 0x6A, // Numpad *
	107: 0x6B, // Numpad +
	109: 0x6D, // Numpad -
	110: 0x6E, // Numpad .
	111: 0x6F, // Numpad /
}

var virtualKeysReversed = map[int]string{
	0x01: "VK_LBUTTON",   // Left mouse button
	0x02: "VK_RBUTTON",   // Right mouse button
	0x03: "VK_CANCEL",    // Control-break processing
	0x04: "VK_MBUTTON",   // Middle mouse button
	0x05: "VK_XBUTTON1",  // X1 mouse button
	0x06: "VK_XBUTTON2",  // X2 mouse button
	0x08: "VK_BACK",      // Backspace key
	0x09: "VK_TAB",       // Tab key
	0x0C: "VK_CLEAR",     // Clear key
	0x0D: "VK_RETURN",    // Enter key
	0x10: "VK_SHIFT",     // Shift key
	0x11: "VK_CONTROL",   // Ctrl key
	0x12: "VK_MENU",      // Alt key
	0x13: "VK_PAUSE",     // Pause key
	0x14: "VK_CAPITAL",   // Caps Lock key
	0x1B: "VK_ESCAPE",    // Esc key
	0x20: "VK_SPACE",     // Spacebar
	0x21: "VK_PRIOR",     // Page Up key
	0x22: "VK_NEXT",      // Page Down key
	0x23: "VK_END",       // End key
	0x24: "VK_HOME",      // Home key
	0x25: "VK_LEFT",      // Left arrow key
	0x26: "VK_UP",        // Up arrow key
	0x27: "VK_RIGHT",     // Right arrow key
	0x28: "VK_DOWN",      // Down arrow key
	0x29: "VK_SELECT",    // Select key
	0x2A: "VK_PRINT",     // Print key
	0x2B: "VK_EXECUTE",   // Execute key
	0x2C: "VK_SNAPSHOT",  // Print Screen key
	0x2D: "VK_INSERT",    // Insert key
	0x2E: "VK_DELETE",    // Delete key
	0x2F: "VK_HELP",      // Help key
	0x5B: "VK_LWIN",      // Left Windows key
	0x5C: "VK_RWIN",      // Right Windows key
	0x5D: "VK_APPS",      // Applications key
	0x5F: "VK_SLEEP",     // Sleep key
	0x60: "VK_NUMPAD0",   // Numpad 0 key
	0x61: "VK_NUMPAD1",   // Numpad 1 key
	0x62: "VK_NUMPAD2",   // Numpad 2 key
	0x63: "VK_NUMPAD3",   // Numpad 3 key
	0x64: "VK_NUMPAD4",   // Numpad 4 key
	0x65: "VK_NUMPAD5",   // Numpad 5 key
	0x66: "VK_NUMPAD6",   // Numpad 6 key
	0x67: "VK_NUMPAD7",   // Numpad 7 key
	0x68: "VK_NUMPAD8",   // Numpad 8 key
	0x69: "VK_NUMPAD9",   // Numpad 9 key
	0x6A: "VK_MULTIPLY",  // Numpad Multiply key
	0x6B: "VK_ADD",       // Numpad Add key
	0x6C: "VK_SEPARATOR", // Numpad Separator key
	0x6D: "VK_SUBTRACT",  // Numpad Subtract key
	0x6E: "VK_DECIMAL",   // Numpad Decimal key
	0x6F: "VK_DIVIDE",    // Numpad Divide key
	0x70: "VK_F1",        // F1 key
	0x71: "VK_F2",        // F2 key
	0x72: "VK_F3",        // F3 key
	0x73: "VK_F4",        // F4 key
	0x74: "VK_F5",        // F5 key
	0x75: "VK_F6",        // F6 key
	0x76: "VK_F7",        // F7 key
	0x77: "VK_F8",        // F8 key
	0x78: "VK_F9",        // F9 key
	0x79: "VK_F10",       // F10 key
	0x7A: "VK_F11",       // F11 key
	0x7B: "VK_F12",       // F12 key
	0x90: "VK_NUMLOCK",   // Num Lock key
	0x91: "VK_SCROLL",    // Scroll Lock key
}

var alphanumericKeyCodeMap = map[int]string{
	48:  "0", // Key code for 0
	49:  "1", // Key code for 1
	50:  "2", // Key code for 2
	51:  "3", // Key code for 3
	52:  "4", // Key code for 4
	53:  "5", // Key code for 5
	54:  "6", // Key code for 6
	55:  "7", // Key code for 7
	56:  "8", // Key code for 8
	57:  "9", // Key code for 9
	65:  "A", // Key code for A
	66:  "B", // Key code for B
	67:  "C", // Key code for C
	68:  "D", // Key code for D
	69:  "E", // Key code for E
	70:  "F", // Key code for F
	71:  "G", // Key code for G
	72:  "H", // Key code for H
	73:  "I", // Key code for I
	74:  "J", // Key code for J
	75:  "K", // Key code for K
	76:  "L", // Key code for L
	77:  "M", // Key code for M
	78:  "N", // Key code for N
	79:  "O", // Key code for O
	80:  "P", // Key code for P
	81:  "Q", // Key code for Q
	82:  "R", // Key code for R
	83:  "S", // Key code for S
	84:  "T", // Key code for T
	85:  "U", // Key code for U
	86:  "V", // Key code for V
	87:  "W", // Key code for W
	88:  "X", // Key code for X
	89:  "Y", // Key code for Y
	90:  "Z", // Key code for Z
	97:  "a", // Key code for a
	98:  "b", // Key code for b
	99:  "c", // Key code for c
	100: "d", // Key code for d
	101: "e", // Key code for e
	102: "f", // Key code for f
	103: "g", // Key code for g
	104: "h", // Key code for h
	105: "i", // Key code for i
	106: "j", // Key code for j
	107: "k", // Key code for k
	108: "l", // Key code for l
	109: "m", // Key code for m
	110: "n", // Key code for n
	111: "o", // Key code for o
	112: "p", // Key code for p
	113: "q", // Key code for q
	114: "r", // Key code for r
	115: "s", // Key code for s
	116: "t", // Key code for t
	117: "u", // Key code for u
	118: "v", // Key code for v
	119: "w", // Key code for w
	120: "x", // Key code for x
	121: "y", // Key code for y
	122: "z", // Key code for z
}
