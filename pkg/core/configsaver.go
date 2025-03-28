package core

import (
	"archive/zip"
	"bufio"
	"errors"
	"fmt"
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

	"gopkg.in/ini.v1"
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

func NewConfigSaver(
	exportDirs map[types.Game]pref.Preference[string],
	dbHelper *DbHelper,
) *ConfigSaver {
	return &ConfigSaver{
		exportDirs: exportDirs,
		db:         dbHelper,
	}
}

func (cs *ConfigSaver) saveConfig(g types.Game) ([]string, error) {

	created := []string{}

	saved, err := cs.readConfig(g)
	if err != nil {
		return created, err
	}

	paths := getPathsFromUserConfig(saved)
	errs := []error{}

	for path, vars := range paths {
		ifp, ok := cs.getIniFilePath(path, g)
		if !ok {
			continue
		}

		rc, err := ifp.open()
		if err != nil {
			errs = append(errs, err)
			continue
		}
		defer rc.Close()

		configSection := getConfigSection(rc)
		iniFile, err := ini.Load([]byte(configSection))

		if err != nil {
			errs = append(errs, err)
			continue
		}

		log.LogDebug("config for " + g.Name() + "\n" + configSection)
		section, err := iniFile.GetSection("Constants")
		if err != nil {
			errs = append(errs, err)
			continue
		}

		keys := section.Keys()
		keyMap := make(map[string]*ini.Key, len(keys))
		for _, v := range keys {
			keyMap[strings.ToLower(v.Name())] = v
		}

		for _, v := range vars {

			if key, ok := keyMap[strings.ToLower("global persist $"+v.name)]; !ok || key == nil {
				log.LogDebug("Key not found " + v.name)
				continue
			} else {
				log.LogDebugf("confvar = %v entry = %s : %s", v, key.Name(), key.Value())
				if key.Value() == v.value {
					continue
				} else {
					key.SetValue(v.value)
				}
			}
		}

		configCache := util.GetModConfigCache(ifp.mod)
		conf := filepath.Join(configCache, "saved_conf.ini")

		err = os.MkdirAll(filepath.Dir(conf), os.ModePerm)
		if err != nil {
			errs = append(errs, err)
			continue
		}

		f, err := os.Create(conf)
		if err != nil {
			errs = append(errs, err)
			continue
		}
		defer f.Close()

		_, err = iniFile.WriteTo(f)
		if err != nil {
			log.LogError(err.Error())
		}

		created = append(created, conf)
	}

	return created, errors.Join(errs...)
}

type IniFilePath struct {
	isZip   bool
	mod     types.Mod
	path    string
	zipPath string
}

type iniFilePathReadCloser struct {
	rc   *zip.ReadCloser
	file io.ReadCloser
}

func (c *iniFilePathReadCloser) Read(p []byte) (n int, err error) {
	return c.file.Read(p)
}

func (c *iniFilePathReadCloser) Close() error {
	errs := make([]error, 0, 2)
	if c.rc != nil {
		errs = append(errs, c.rc.Close())
	}
	errs = append(errs, c.file.Close())

	return errors.Join(errs...)
}

func (ifp IniFilePath) open() (io.ReadCloser, error) {
	if !ifp.isZip {
		return os.Open(ifp.path)
	} else {
		r, err := zip.OpenReader(ifp.path)
		if err != nil {
			return nil, err
		}

		for _, f := range r.File {
			if strings.EqualFold(f.Name, ifp.zipPath) {
				frc, err := f.Open()
				if err != nil {
					return nil, err
				}

				return &iniFilePathReadCloser{
					file: frc,
					rc:   r,
				}, nil
			}
		}
		return nil, fmt.Errorf("file %s not found in zip", ifp.zipPath)
	}
}

func getPathsFromUserConfig(config string) map[string][]ConfVar {
	paths := map[string][]ConfVar{}

	for _, line := range strings.Split(config, "\n") {
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
	return paths
}

func (cs *ConfigSaver) getIniFilePath(path string, game types.Game) (IniFilePath, bool) {
	//mods\x\...\25524_bearcharlotte\bearcharlotte\bearcharlotte\merged.ini -> 25524_bearcharlotte\bearcharlotte\bearcharlotte\merged.ini
	// assumes that files are in a dir "Mods"
	exportDir := strings.ToLower(cs.exportDirs[game].Get())
	modsPart := strings.LastIndex(exportDir, "mods")
	if modsPart == -1 {
		return IniFilePath{}, false
	}
	exportDir = exportDir[modsPart:]
	rel, err := filepath.Rel(exportDir, strings.ToLower(filepath.Clean(path)))

	if err != nil {
		log.LogError(err.Error())
		return IniFilePath{}, false
	}
	// 25524_bearcharlotte\(this is within the zip or dir)bearcharlotte\bearcharlotte\merged.ini
	// mIdP = modId _ mod file name
	// mFileP = content within mod folder either zip or dir
	// subP = path within the dir or zip to merged.ini
	const (
		mIdP   = 0
		mFileP = 1
		subP   = mFileP + 1
	)
	parts := strings.Split(rel, string(filepath.Separator))
	if len(parts) < subP {
		return IniFilePath{}, false
	}
	// id: 25524 fname: bearcharlotte
	split := strings.SplitN(parts[mIdP], "_", 2)
	if len(split) == 0 {
		return IniFilePath{}, false
	}

	modId, err := strconv.Atoi(split[0])
	if err != nil {
		return IniFilePath{}, false
	}
	mod, err := cs.db.SelectModById(modId)
	if err != nil {
		return IniFilePath{}, false
	}
	modDir := util.GetModDir(mod)

	ifp := IniFilePath{mod: mod}

	subpath := filepath.Join(parts[subP:]...)

	// 25524_bearcharlotte\bearcharlotte\bearcharlotte\merged.ini
	// 1st bearcharlotte can be either a zip or a dir
	// need to check bc it is unzipped and config file doesnt have this info
	withZip := filepath.Join(modDir, parts[mFileP]+".zip")
	withoutZip := filepath.Join(modDir, parts[mFileP])

	if exists, _ := util.FileExists(withZip); !exists {
		ifp.isZip = false
		ifp.path = filepath.Join(withoutZip, subpath)
	} else {
		ifp.isZip = true
		ifp.path = withZip
		ifp.zipPath = subpath
	}

	return ifp, true
}

func getConfigSection(r io.Reader) string {

	sectionRegex := regexp.MustCompile(`\[(.*?)\]`)

	s := bufio.NewScanner(r)
	sb := strings.Builder{}

	sb.WriteString("[Constants]")
	sb.WriteRune('\n')

	for s.Scan() {

		line := s.Text()

		if strings.TrimSpace(line) == "[Constants]" {

			for s.Scan() {
				line = s.Text()

				if sectionRegex.MatchString(line) &&
					strings.TrimSpace(line) != "[Constants]" {
					break
				} else {
					sb.WriteString(line)
					sb.WriteRune('\n')
				}
			}
		}
	}

	return sb.String()
}

func GetEnabledConfig(m types.Mod) (*ini.File, error) {
	confCache := util.GetModConfigCache(m)
	e, err := os.ReadDir(confCache)
	if err != nil {
		return nil, err
	}

	var config *ini.File
	if len(e) > 0 {
		if b, err := os.ReadFile(filepath.Join(confCache, e[0].Name())); err == nil {
			if i, err := ini.Load(b); err == nil {
				config = i
			}
		}
	}
	return config, nil
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
