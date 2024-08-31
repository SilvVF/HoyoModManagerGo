package core

import (
	"database/sql"
	"fmt"
	"hmm/db"
	"hmm/pkg/log"
	"hmm/pkg/types"
	"io"
	"net/http"
	"os"
	"strings"

	"golift.io/xtractr"
)

type Downloader struct {
	db *DbHelper
}

func NewDownloader(db *DbHelper) *Downloader {
	return &Downloader{db: db}
}

func (d *Downloader) Delete(modId int) {

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

	x := &xtractr.XFile{
		FilePath:  file.Name(),
		OutputDir: GetCharacterDir(character, game), // do not forget this.
	}

	// size is how many bytes were written.
	// files may be nil, but will contain any files written (even with an error).
	size, files, _, err := xtractr.ExtractFile(x)
	if err != nil || files == nil {
		log.LogError(fmt.Sprintf("%d, %s, %s", size, strings.Join(files, ","), err.Error()))
	}

	d.db.queries.InsertMod(d.db.ctx, db.InsertModParams{
		ModFilename:    filename,
		Game:           int64(game),
		CharName:       character,
		CharId:         int64(characterId),
		Selected:       false,
		PreviewImages:  "",
		GbId:           sql.NullInt64{Valid: gbId != -1, Int64: int64(gbId)},
		ModLink:        sql.NullString{Valid: link != "", String: link},
		GbFilename:     sql.NullString{Valid: filename != "", String: filename},
		GbDownloadLink: sql.NullString{Valid: link != "", String: link},
	})
	log.LogPrint(fmt.Sprintf("Bytes written: %d Files Extracted:\n - %s", size, strings.Join(files, "\n -")))

	return nil
}
