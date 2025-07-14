package core

import (
	"context"
	"errors"
	"hmm/pkg/core/dbh"
	"hmm/pkg/log"
	"hmm/pkg/pref"
	"hmm/pkg/util"
	"os"
)

type ChangeDirEvent string

const (
	CHANGE_DIR_EVENT                = "change_dir"
	Progress         ChangeDirEvent = "progress"
	Error            ChangeDirEvent = "error"
	Finished         ChangeDirEvent = "finished"
)

type Transfer struct {
	sync      *SyncHelper
	cancel    chan struct{}
	emitter   EventEmmiter
	dirPref   pref.Preference[string]
	canRemove map[string]struct{}
}

func NewTransfer(sync *SyncHelper, emitter EventEmmiter, dirPref pref.Preference[string]) *Transfer {
	return &Transfer{
		sync:      sync,
		emitter:   emitter,
		dirPref:   dirPref,
		cancel:    make(chan struct{}),
		canRemove: map[string]struct{}{},
	}
}

func (t *Transfer) Cancel() {
	t.cancel <- struct{}{}
}

func (t *Transfer) ChangeRootModDir(dest string, copyOver bool) (state ChangeDirEvent, err error) {

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

	err = t.dirPref.Set(dest)
	if err != nil {
		return Error, nil
	}

	if !copyOver {
		return Finished, nil
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	go func() {
		select {
		case <-ctx.Done():
			return
		case <-t.cancel:
			cancel()
		}
	}()

	err = util.CopyRecursivleyProgFn(ctx, prevDir, dest, false, func(progress, total int64) {
		t.emitter.Emit(CHANGE_DIR_EVENT, Progress, DataProgress{Total: total, Progress: progress})
	})

	if err != nil {
		return Error, err
	}

	return Finished, nil
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
