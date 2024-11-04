package pref

import (
	"context"
	"hmm/pkg/util"
	"log"
	"path/filepath"
	"sync"

	"github.com/rosedblabs/rosedb/v2"
)

type RoseDbPrefs struct {
	*rosedb.DB
	cancel   context.CancelFunc
	watchers map[chan<- []byte]struct{}
	mutex    sync.RWMutex
}

func (r *RoseDbPrefs) Close() error {
	r.cancel()
	return r.DB.Close()
}

func (r *RoseDbPrefs) PutWatcher(watch chan<- []byte) {
	r.mutex.Lock()
	r.watchers[watch] = struct{}{}
	r.mutex.Unlock()
}

func (r *RoseDbPrefs) RemoveWatcher(watch chan<- []byte) {
	r.mutex.Lock()
	delete(r.watchers, watch)
	r.mutex.Unlock()
}

func NewRosePrefs(ctx context.Context) PrefrenceDb {
	context, cancel := context.WithCancel(ctx)

	rose, err := rosedb.Open(rosedb.Options{
		DirPath:           filepath.Join(util.GetCacheDir(), "/rosedb_basic"),
		SegmentSize:       rosedb.DefaultOptions.SegmentSize,
		Sync:              rosedb.DefaultOptions.Sync,
		BytesPerSync:      rosedb.DefaultOptions.BytesPerSync,
		WatchQueueSize:    300,
		AutoMergeCronExpr: rosedb.DefaultOptions.AutoMergeCronExpr,
	})
	if err != nil {
		panic(err)
	}
	db := &RoseDbPrefs{
		DB:       rose,
		cancel:   cancel,
		watchers: map[chan<- []byte]struct{}{},
		mutex:    sync.RWMutex{},
	}

	go func() {
		eventCh, err := rose.Watch()
		if err != nil {
			return
		}

		defer func() {
			db.mutex.Lock()
			for watcher := range db.watchers {
				close(watcher)
			}
			db.watchers = map[chan<- []byte]struct{}{}
			db.mutex.Unlock()
		}()

		for {
			select {
			case event := <-eventCh:
				// when db closed, the event will receive nil.
				if event == nil {
					log.Println("The db is closed, so the watch channel is closed.")
					return
				}
				log.Printf("Get a new event: key%s \n", event.Key)

				go func() {
					db.mutex.RLock()
					defer db.mutex.RUnlock()

					for watcher := range db.watchers {
						watcher <- event.Key
					}
				}()
			case <-context.Done():
				return
			}
		}
	}()

	return db
}
