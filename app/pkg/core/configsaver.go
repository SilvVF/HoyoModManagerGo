package core

import (
	"bufio"
	"errors"
	"hmm/pkg/core/dbh"
	"hmm/pkg/log"
	"hmm/pkg/pref"
	"hmm/pkg/types"
	"hmm/pkg/util"
	"io"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"gopkg.in/ini.v1"
)

const d3dxUserFile = "d3dx_user.ini"
const SavedConf = "saved_conf.ini"

type ConfigSaver struct {
	db         *dbh.DbHelper
	exportDirs map[types.Game]pref.Preference[string]
}

func NewConfigSaver(
	// dirs used to find path to d3dxUserFile
	exportDirs map[types.Game]pref.Preference[string],
	dbHelper *dbh.DbHelper,
) *ConfigSaver {
	return &ConfigSaver{
		db:         dbHelper,
		exportDirs: exportDirs,
	}
}

func (cs *ConfigSaver) saveConfig(g types.Game) ([]string, error) {

	created := []string{}

	entries, err := cs.readD3dxUserIni(g)
	if err != nil {
		log.LogError("failed reading d3dxuser.ini: " + err.Error())
		return created, err
	}

	errs := []error{}

	// group the entries by mod for eaisier file writing
	grouped := map[int][]D3dxEntry{}
	for _, entry := range entries {
		if s, ok := grouped[entry.mod.Id]; ok {
			grouped[entry.mod.Id] = append(s, entry)
		} else {
			grouped[entry.mod.Id] = []D3dxEntry{entry}
		}
	}
	log.LogDebugf("%v", grouped)
	// write to mods saved_conf.ini file with values to use when generating next.
	// file is always truncated
	for _, group := range grouped {

		configDir := util.GetModConfigCache(group[0].mod)
		err := os.MkdirAll(configDir, os.ModePerm)
		if err != nil {
			errs = append(errs, err)
			continue
		}

		file, err := os.OpenFile(filepath.Join(configDir, SavedConf), os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0644)
		if err != nil {
			errs = append(errs, err)
			continue
		}
		defer file.Close()

		file.WriteString("[Constants]\n")
		for _, entry := range group {
			file.WriteString(entry.ivar + " = " + entry.ival + "\n")
		}
	}

	return created, errors.Join(errs...)
}

func GetEnabledConfig(m types.Mod) (*ini.File, error) {

	confCache := util.GetModConfigCache(m)
	file, err := os.Open(filepath.Join(confCache, SavedConf))

	if err != nil {
		return nil, err
	}

	b, err := io.ReadAll(file)
	if err != nil {
		return nil, err
	}

	return ini.Load(b)
}

type D3dxEntry struct {
	mod      types.Mod
	modFname string
	raw      string
	ini      string
	relpath  string
	ivar     string
	ival     string
}

// reads config from d3dxUser Ini ignoring non mod entries
func (cs *ConfigSaver) readD3dxUserIni(g types.Game) ([]D3dxEntry, error) {

	export, ok := cs.exportDirs[g]

	if !ok || !export.IsSet() {
		return make([]D3dxEntry, 0), errors.New("export dir not set")
	}

	parent := filepath.Dir(export.Get())
	config := filepath.Join(parent, d3dxUserFile)

	file, err := os.Open(config)
	if err != nil {
		return make([]D3dxEntry, 0), err

	}
	defer file.Close()

	scanner := bufio.NewScanner(file)

	output := []D3dxEntry{}
	// scan the ini file and look for lines that maybe part of the config
	for scanner.Scan() {
		line := scanner.Text()
		// read the entry
		// line format $\mods\124699_furinaextravaganza_v192\furinaextravaganza\furina.ini\hat_u = 0
		// IMPORTANT all entries should have the mod id as a prefix
		if strings.HasPrefix(line, "$\\mods") {
			trimmed := strings.TrimPrefix(line, "$\\mods\\")

			parts := strings.Split(trimmed, "\\")
			if len(parts) == 0 {
				continue
			}

			genName := strings.SplitN(parts[0], "_", 2)

			if len(genName) != 2 {
				continue
			}

			modId, err := strconv.Atoi(genName[0])
			if err != nil {
				continue
			}
			modFileName := genName[1]

			mod, err := cs.db.SelectModById(modId)
			if err != nil {
				continue
			}

			ini := ""
			rel := ""

			for i := len(parts) - 1; i > 0; i-- {
				p := parts[i]
				if strings.HasSuffix(p, ".ini") {
					ini = p
					rel = strings.Join(parts[1:i], "\\")
					break
				}
			}

			if rel == "" || ini == "" {
				continue
			}

			setting := strings.Split(parts[len(parts)-1], "=")
			if len(setting) != 2 {
				continue
			}

			entry := D3dxEntry{
				mod:      mod,
				raw:      line,
				ini:      ini,
				relpath:  rel,
				ivar:     strings.TrimSpace(setting[0]),
				ival:     strings.TrimSpace(setting[1]),
				modFname: modFileName,
			}
			output = append(output, entry)
		}
	}

	return output, nil
}
