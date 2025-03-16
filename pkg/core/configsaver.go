package core

import (
	"bufio"
	"errors"
	"hmm/pkg/pref"
	"hmm/pkg/types"
	"io"
	"os"
	"path/filepath"
	"regexp"
	"strings"
)

const d3dxUserFile = "d3dx_user.ini"

type ConfigSaver struct {
	exportDirs map[types.Game]pref.Preference[string]
}

type ConfVar struct {
	name  string
	value string
}

func NewConfigSaver(exportDirs map[types.Game]pref.Preference[string]) *ConfigSaver {
	return &ConfigSaver{
		exportDirs: exportDirs,
	}
}

func filepathDropN(s string, n int) string {
	cleaned := filepath.Clean(s)
	parts := filepath.SplitList(cleaned)

	return filepath.Join(parts[n:]...)
}

func (cs *ConfigSaver) saveConfig(g types.Game, exportDir string) (map[string][]ConfVar, error) {

	saved, err := cs.readConfig(g)
	if err != nil {
		return nil, err
	}

	paths := map[string][]ConfVar{}

	for _, line := range strings.Split(saved, "\n") {
		path := strings.TrimLeft(line, "$")
		eqIndex := strings.LastIndex(path, "=")

		if eqIndex == -1 {
			continue
		}

		value := strings.TrimSpace(path[eqIndex+1:])
		path = path[:eqIndex]

		path = strings.TrimSpace(path)

		parts := strings.Split(path, "\\")

		name := parts[len(parts)-1]
		path = filepath.Join(parts[:len(parts)-1]...)

		confVar := ConfVar{name: name, value: value}

		if arr, ok := paths[path]; !ok {
			paths[path] = []ConfVar{confVar}
		} else {
			paths[path] = append(arr, confVar)
		}
	}

	// for path, vars := range paths {
	// 	fp := filepath.Join(exportDir, filepathDropN(path, 1))
	// 	f, err := os.Open(fp)
	// 	if err != nil {
	// 		continue
	// 	}
	// 	defer f.Close()

	// }

	return paths, nil
}

func getConfigSection(r io.Reader) string {

	sectionRegex := regexp.MustCompile("\\[(.*?)\\]")

	s := bufio.NewScanner(r)
	sb := strings.Builder{}

outer:
	for s.Scan() {

		line := s.Text()

		if strings.TrimSpace(line) == "[Constants]" {

			for s.Scan() {
				line = s.Text()

				if sectionRegex.MatchString(line) {
					break outer
				} else {
					sb.WriteString(line)
				}
			}
		}
	}

	return sb.String()
}

func (cs *ConfigSaver) readConfig(g types.Game) (string, error) {

	export, ok := cs.exportDirs[g]

	if !ok || !export.IsSet() {
		return "", errors.New("export dir not set")
	}

	parent := filepath.Dir(export.Get())
	config := filepath.Join(parent, d3dxUserFile)

	file, err := os.Open(config)
	if err != nil {
		return "", err

	}
	defer file.Close()

	scanner := bufio.NewScanner(file)

	sb := strings.Builder{}

	for scanner.Scan() {
		b := scanner.Bytes()

		sb.Write(b)
		sb.WriteRune('\n')
	}

	return sb.String(), nil
}
