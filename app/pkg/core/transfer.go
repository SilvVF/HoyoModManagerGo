package core

import (
	"context"
	"errors"
	"hmm/pkg/core/dbh"
	"hmm/pkg/log"
	"hmm/pkg/pref"
	"hmm/pkg/util"
	"os"
	"time"
)

const (
	eventName       = "change_dir"
	eventProgress   = "progress"
	eventError      = "error"
	eventFinsihshed = "finished"
	debounce        = time.Second * 1
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

func (t *Transfer) ChangeRootModDir(dest string, copyOver bool) (err error) {

	prevDir := t.dirPref.Get()

	defer func() {
		if err == nil {
			t.canRemove[prevDir] = struct{}{}
			err := dbh.BackupDatabase()
			if err != nil {
				log.LogError(err.Error())
			}
			t.sync.RunAll(SyncRequestLocal)
		}
	}()

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
