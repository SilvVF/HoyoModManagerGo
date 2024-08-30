package core

import (
	"fmt"
	"hmm/pkg/log"
	"io"
	"net/http"
	"os"
	"strings"

	"golift.io/xtractr"
)

type Downloader struct{}

func (d *Downloader) Donwload(link string, filename string, output string) bool {

	log.LogPrint(link + output)
	res, err := http.Get(link)
	if err != nil {
		log.LogPrint(err.Error())
		return false
	}
	defer res.Body.Close()
	bytes, err := io.ReadAll(res.Body)
	if err != nil {
		log.LogPrint(err.Error())
		return false
	}
	file, err := os.CreateTemp("", "*"+filename)
	if err != nil {
		log.LogError(err.Error())
		return false
	}
	defer os.Remove(file.Name())

	_, err = file.Write(bytes)
	if err != nil {
		log.LogError(err.Error())
		return false
	}

	x := &xtractr.XFile{
		FilePath:  file.Name(),
		OutputDir: output, // do not forget this.
	}

	// size is how many bytes were written.
	// files may be nil, but will contain any files written (even with an error).
	size, files, _, err := xtractr.ExtractFile(x)
	if err != nil || files == nil {
		log.LogError(fmt.Sprintf("%d, %s, %s", size, strings.Join(files, ","), err.Error()))
	}

	log.LogPrint(fmt.Sprintf("Bytes written: %d Files Extracted:\n - %s", size, strings.Join(files, "\n -")))
	return true
}
