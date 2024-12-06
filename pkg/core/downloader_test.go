package core

import (
	"fmt"
	"os"
	"path/filepath"
	"testing"
)

const (
	rarFile = "\\test_resources\\navia.rar"
	zipFile = "\\test_resources\\clorinde.zip"
)

func TestExtractRar(t *testing.T) {

	path := filepath.Join(workingDir, rarFile)
	out := filepath.Join(workingDir, "test_resources", "output")
	fmt.Println(path)

	os.RemoveAll(out)
	os.MkdirAll(out, os.ModePerm)

	size, files, contents, err := extractRAR(&XFile{
		FilePath:  path,
		OutputDir: out,
		DirMode:   0777,
		FileMode:  0777,
	},
		func(progress, total int64) {},
	)

	fmt.Println(size, files, contents)
	if err != nil {
		t.Error(err)
	}
}

func TestExtractZip(t *testing.T) {

	path := filepath.Join(workingDir, zipFile)
	out := filepath.Join(workingDir, "test_resources", "output")
	fmt.Println(path)

	os.RemoveAll(out)
	os.MkdirAll(out, os.ModePerm)

	contents, err := extract(path, filepath.Join(workingDir, "test_resources", "output"), func(progress, total int64) {})

	fmt.Println(contents)
	if err != nil {
		t.Error(err)
	}
}
