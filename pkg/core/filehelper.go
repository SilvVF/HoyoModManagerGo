package core

import (
	"archive/zip"
	"io"
	"os"
	"path/filepath"
)

func ZipFolder(path string) error {
	file, err := os.Create(path + ".zip")
	if err != nil {
		panic(err)
	}
	defer file.Close()

	w := zip.NewWriter(file)
	defer w.Close()

	walker := func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if info.IsDir() {
			return nil
		}
		file, err := os.Open(path)
		if err != nil {
			return err
		}
		defer file.Close()

		f, err := w.Create(filepath.Join(filepath.Base(path), info.Name()))
		if err != nil {
			return err
		}

		_, err = io.Copy(f, file)
		if err != nil {
			return err
		}

		return nil
	}
	err = filepath.Walk(path, walker)
	if err != nil {
		return err
	}

	err = os.RemoveAll(path)

	return err
}
