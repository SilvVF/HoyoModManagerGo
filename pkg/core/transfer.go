package core

import (
	"context"
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
	debounce        = time.Millisecond * 100
)

type Transfer struct {
	sync      *SyncHelper
	emitter   DefaultEmmiter
	dirPref   pref.Preference[string]
	canRemove map[string]struct{}
}

func NewTransfer(sync *SyncHelper, emitter DefaultEmmiter, dirPref pref.Preference[string]) *Transfer {
	return &Transfer{
		sync:      sync,
		emitter:   emitter,
		dirPref:   dirPref,
		canRemove: map[string]struct{}{},
	}
}

func backupAndRunSync() {

}

func (t *Transfer) ChangeRootModDir(dest string, copyOver bool) (err error) {

	defer func() {
		if err != nil {
			backupAndRunSync()
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
	var lastUnsent *DataProgress

	sendEvent := func(progress, total int64) {
		go func() {
			// try to aquire the sem or debounce
			select {
			case sem <- struct{}{}:
			default:
				lastUnsent = &DataProgress{Progress: progress, Total: total}
				return
			}

			t.emitter.Emit(eventName, eventProgress, DataProgress{Total: total, Progress: progress})

			ctx, cancel := context.WithTimeout(context.Background(), debounce)
			defer cancel()

			<-ctx.Done()
			<-sem
		}()
	}

	err = util.CopyRecursivleyProgFn(prevDir, dest, false, sendEvent)
	sem <- struct{}{}

	if lastUnsent != nil {
		t.emitter.Emit(eventName, eventProgress, lastUnsent)
	}

	if err != nil {
		t.emitter.Emit(eventName, eventError, err.Error())
	} else {
		t.emitter.Emit(eventName, eventFinsihshed)
	}

	return err
}

func (a *Transfer) RemoveAll(path string) error {
	return os.RemoveAll(path)
}
