package core

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

const (
	mergedIniPath = "\\test_resources\\keymap\\merged.ini"
	outputPath    = "\\test_resources\\keymap\\output.ini"
)

var d, _ = os.Getwd()
var workingDir = strings.Replace(d, "\\pkg\\core", "", 1)

// TestHelloName calls greetings.Hello with a name, checking
// for a valid return value.
func TestConfigFileGeneration(t *testing.T) {
	expected := `[KeyUnderwaterOutfit]
condition = $active == 1
key = VK_RIGHT
$change = 7

[KeyTop]
condition = $active == 1
key = 5
$change = 1

[KeyBottom]
condition = $active == 1
key = 6
$change = 2

[KeyHat]
condition = $active == 1
key = 7
$change = 3

[KeyNecklace]
condition = $active == 1
key = 8
$change = 4

[KeyDress]
condition = $active == 1
key = 9
$change = 5

[KeyArmsLegs]
condition = $active == 1
key = 0
$change = 6

[KeyBikini]
condition = $active == 1
key = VK_UP
$change = 8
`
	inputFile, err := os.Open(filepath.Join(workingDir, mergedIniPath))
	if err != nil {
		panic(err)
	}

	if strings.TrimSpace(getKeybindSection(inputFile)) != strings.TrimSpace(expected) {
		t.Fatal("merged section does not match")
	}
}
