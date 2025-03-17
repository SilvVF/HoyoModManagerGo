package core

import (
	"bufio"
	"errors"
	"hmm/pkg/log"
	"hmm/pkg/pref"
	"hmm/pkg/types"
	"hmm/pkg/util"
	"io"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
)

const d3dxUserFile = "d3dx_user.ini"

type ConfigSaver struct {
	exportDirs map[types.Game]pref.Preference[string]
	db         *DbHelper
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

func (cs *ConfigSaver) saveConfig(g types.Game) (map[string][]ConfVar, error) {

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
	for path, _ := range paths {
		fp, ok := getIniFilePath(path, cs.db)
		if !ok {
			continue
		}

		log.LogDebug(fp)
	}

	return paths, nil
}

func getIniFilePath(path string, exportDir string, db *DbHelper) (string, bool) {
	//mods\25524_bearcharlotte\bearcharlotte\bearcharlotte\merged.ini

	// TODO: split at export dir path incase export is mods/name/...
	parts := filepath.SplitList(path)

	if len(parts) < 4 {
		return "", false
	}
	split := strings.SplitN(parts[1], "_", 1)
	if len(split) == 0 {
		return "", false
	}

	modId, err := strconv.Atoi(split[0])
	if err != nil {
		return "", false
	}

	mod, err := db.SelectModById(modId)
	if err != nil {
		return "", false
	}

	modDir := util.GetModDir(mod)

	var relativeIniPath string
	subpath := filepath.Join(parts[4:]...)

	withZip := filepath.Join(parts[3]+".zip", subpath)
	withoutZip := filepath.Join(parts[3], subpath)

	if ok, err := util.FileExists(relativeIniPath); err != nil || !ok {
		relativeIniPath = withZip
	} else {
		relativeIniPath = withoutZip
	}

	fullPath := filepath.Join(modDir, relativeIniPath)
	return fullPath, true
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
