package core

import (
	"fmt"
	"hmm/pkg/log"
	"hmm/pkg/types"
	"io"
	"net/http"
	"os"
	"path"
	"strings"

	unarr "github.com/gen2brain/go-unarr"
	"golift.io/xtractr"
)

type Downloader struct {
	db *DbHelper
}

func NewDownloader(db *DbHelper) *Downloader {
	return &Downloader{db: db}
}

func (d *Downloader) Delete(modId int) error {
	mod, err := d.db.SelectModById(modId)
	if err != nil {
		log.LogPrint(err.Error())
		return err
	}
	path := path.Join(GetCharacterDir(mod.Character, mod.Game), mod.Filename)
	log.LogPrint(path)
	if err = os.RemoveAll(path); err != nil {
		return err
	}
	return d.db.DeleteModById(modId)
}

func (d *Downloader) Donwload(link string, filename string, character string, characterId int, game types.Game, gbId int) error {
	log.LogPrint(fmt.Sprintf("Downloading %s %d", character, game))
	res, err := http.Get(link)
	if err != nil {
		log.LogPrint(err.Error())
		return err
	}
	defer res.Body.Close()
	bytes, err := io.ReadAll(res.Body)
	if err != nil {
		log.LogPrint(err.Error())
		return err
	}
	file, err := os.CreateTemp("", "*"+filename)
	if err != nil {
		log.LogError(err.Error())
		return err
	}
	if _, err = file.Write(bytes); err != nil {
		log.LogError(err.Error())
		return err
	}
	file.Close()
	defer os.Remove(file.Name())

	dotIdx := strings.LastIndex(filename, ".")
	outputDir := path.Join(GetCharacterDir(character, game), filename[:dotIdx])
	os.MkdirAll(outputDir, 0777)

	if strings.Contains(filename[dotIdx:], ".rar") {
		x := &xtractr.XFile{
			FilePath:  file.Name(),
			OutputDir: outputDir, // do not forget this.
			FileMode:  0777,
			DirMode:   0777,
		}
		if _, _, _, err := xtractr.ExtractFile(x); err != nil {
			log.LogError(err.Error())
			return err
		}
	} else {
		a, err := unarr.NewArchive(file.Name())
		if err != nil {
			return err
		}
		defer a.Close()
		if _, err = a.Extract(outputDir); err != nil {
			return err
		}
	}

	err = d.db.InsertMod(types.Mod{
		Filename:       filename[:dotIdx],
		Game:           game,
		Character:      character,
		CharacterId:    characterId,
		Enabled:        false,
		PreviewImages:  []string{},
		GbId:           gbId,
		ModLink:        link,
		GbFileName:     filename,
		GbDownloadLink: link,
	})

	return err
}
