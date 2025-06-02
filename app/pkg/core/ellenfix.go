package core

import (
	"context"
	"errors"
	"hmm/pkg/pref"
	"hmm/pkg/types"
	"hmm/pkg/util"
	"io"
	"os"
	"path/filepath"
	"strings"
)

func ApplyEllenFix(fixPref pref.Preference[string], mod types.Mod) error {
	path := fixPref.Get()
	if path == "" {
		return errors.New("path not set")
	}

	archive, err := util.GetModArchive(mod)
	modDir := util.GetModDir(mod)
	if err != nil {
		return err
	}
	newPath := strings.TrimSuffix(archive, ".zip") + "_old" + filepath.Ext(archive)
	err = os.Rename(archive, newPath)
	if err != nil {
		return err
	}

	defer os.RemoveAll(newPath)

	extracted, err := ArchiveExtract(newPath, modDir, true, true, nil)
	if err != nil {
		os.Rename(newPath, archive)
		return err
	}

	exe, err := os.Open(path)
	if err != nil {
		return err
	}
	defer exe.Close()

	fixPath := filepath.Join(extracted, "ellen_fix.exe")
	f, err := os.Create(fixPath)
	if err != nil {
		return err
	}
	defer f.Close()

	io.Copy(exe, f)

	f.Close()
	exe.Close()

	cmder := util.NewCmder(fixPath, context.Background())
	cmder.Run(make([]string, 0))

	ZipFolder(extracted, filepath.Base(archive), nil)

	os.RemoveAll(extracted)

	return nil
}
