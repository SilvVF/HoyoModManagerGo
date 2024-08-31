package core

import (
	"errors"
	"fmt"
	"hmm/pkg/log"
	"hmm/pkg/types"
	"io"
	"net/http"
	"os"
	"path"
	"strings"

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
	defer os.Remove(file.Name())

	_, err = file.Write(bytes)
	if err != nil {
		log.LogError(err.Error())
		return err
	}

	dotIdx := strings.LastIndex(filename, ".")
	if dotIdx == -1 {
		return errors.New("invalid file provided")
	}
	fileWithoutExt := filename[:dotIdx]

	x := &xtractr.XFile{
		FilePath:  file.Name(),
		OutputDir: path.Join(GetCharacterDir(character, game), fileWithoutExt), // do not forget this.
	}

	// size is how many bytes were written.
	// files may be nil, but will contain any files written (even with an error).
	size, files, archives, err := xtractr.ExtractFile(x)
	if err != nil || files == nil {
		log.LogError(fmt.Sprintf("%d, %s, %s", size, strings.Join(files, ","), err.Error()))
		return err
	}

	for _, f := range files {
		log.LogPrint(f)
	}
	log.LogPrint("============")
	for _, f := range archives {
		log.LogPrint(f)
	}

	d.db.InsertMod(types.Mod{
		Filename:       fileWithoutExt,
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
	log.LogPrint(fmt.Sprintf("Bytes written: %d Files Extracted:\n - %s", size, strings.Join(files, "\n -")))

	return nil
}
