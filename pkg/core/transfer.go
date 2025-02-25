package core

import (
	"context"
	"errors"
	"hmm/pkg/log"
	"hmm/pkg/pref"
	"hmm/pkg/util"
	"io"
	"os"
	"path/filepath"
	"strings"
	"time"
)

const (
	eventName       = "change_dir"
	eventProgress   = "progress"
	eventError      = "error"
	eventFinsihshed = "finished"
	debounce        = time.Millisecond * 100
)

type Transfer struct {
	sync      *SyncHelper
	emitter   EventEmmiter
	dirPref   pref.Preference[string]
	canRemove map[string]struct{}
}

func NewTransfer(sync *SyncHelper, emitter EventEmmiter, dirPref pref.Preference[string]) *Transfer {
	return &Transfer{
		sync:      sync,
		emitter:   emitter,
		dirPref:   dirPref,
		canRemove: map[string]struct{}{},
	}
}

func backupDatabase() error {
	dbFile := util.GetDbFile()
	currentTime := time.Now()
	backupFileName := strings.ReplaceAll(currentTime.Format("2006-01-02 15:04:05"), " ", "_")
	backupFileName = strings.ReplaceAll(backupFileName, ":", "-")

	db, err := os.Open(dbFile)
	if err != nil {
		return err
	}
	defer db.Close()

	backupDir := filepath.Join(util.GetCacheDir(), "backup")
	os.MkdirAll(backupDir, os.ModePerm)
	backup, err := os.Create(filepath.Join(backupDir, backupFileName+".db"))
	if err != nil {
		return err
	}
	defer backup.Close()

	_, err = io.Copy(db, backup)
	return err
}

func (t *Transfer) ChangeRootModDir(dest string, copyOver bool) (err error) {

	defer func() {
		if err == nil {
			t.canRemove[dest] = struct{}{}
			err := backupDatabase()
			if err != nil {
				log.LogError(err.Error())
			}
			t.sync.RunAll(SyncRequestLocal)
		}
	}()

	prevDir := t.dirPref.Get()

	if err = t.dirPref.Set(dest); err != nil {
		return err
	}

	if !copyOver {
		return nil
	}

	t.emitter.Emit(eventName, "start")

	sem := make(chan struct{}, 1)
	var tot int64

	sendEvent := func(progress, total int64) {
		go func() {
			// try to aquire the sem or debounce
			select {
			case sem <- struct{}{}:
			default:
				return
			}

			tot = total
			t.emitter.Emit(eventName, eventProgress, DataProgress{Total: total, Progress: progress})

			ctx, cancel := context.WithTimeout(context.Background(), debounce)
			defer cancel()

			<-ctx.Done()
			<-sem
		}()
	}

	err = util.CopyRecursivleyProgFn(prevDir, dest, false, sendEvent)
	sem <- struct{}{}

	if err != nil {
		t.emitter.Emit(eventName, eventError, err.Error())
	} else {
		t.emitter.Emit(eventName, eventProgress, DataProgress{Total: tot, Progress: tot})
		t.emitter.Emit(eventName, eventFinsihshed)
	}

	return err
}

func (t *Transfer) RemoveAll(path string) error {

	if _, ok := t.canRemove[path]; !ok {
		return errors.New("can not remove path that wasnt transfered")
	}

	err := os.RemoveAll(path)
	if err == nil {
		delete(t.canRemove, path)
	}

	return err
}
