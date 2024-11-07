package pref

import (
	"hmm/pkg/assert"
	"log"
	"sync"
	"sync/atomic"

	"github.com/rosedblabs/rosedb/v2"
)

type RoseDbPrefs struct {
	*rosedb.DB
	closed   *atomic.Bool
	watchers map[string][]chan struct{}
	mutex    sync.RWMutex
}

func (r *RoseDbPrefs) Close() error {
	r.closed.Swap(true)
	return r.DB.Close()
}

func (r *RoseDbPrefs) Closed() bool {
	return r.closed.Load()
}

func (r *RoseDbPrefs) CreateWatcher(key []byte) <-chan struct{} {
	r.mutex.Lock()
	defer r.mutex.Unlock()

	watcher := make(chan struct{}, WATCH_BUFFER_SIZE)
	r.watchers[string(key)] = append(r.watchers[string(key)], watcher)

	return watcher
}

func (r *RoseDbPrefs) RemoveWatcher(key []byte, watcher <-chan struct{}) {
	r.mutex.Lock()
	defer r.mutex.Unlock()

	k := string(key)
	values := r.watchers[k]

	for i, v := range values {
		if v == watcher {
			new := append(values[:i], values[i+1:]...)
			if len(new) == 0 {
				delete(r.watchers, k)
			} else {
				r.watchers[string(key)] = new
			}
			close(v)
		}
	}
}

func NewRosePrefDb(options rosedb.Options) PrefrenceDb {

	assert.Assert(options.WatchQueueSize > 0, "Key watch will not work if watch queue size is <= 0")

	rose, err := rosedb.Open(options)
	if err != nil {
		panic(err)
	}
	db := &RoseDbPrefs{
		DB:       rose,
		watchers: map[string][]chan struct{}{},
		mutex:    sync.RWMutex{},
		closed:   &atomic.Bool{},
	}

	go func() {
		eventCh, err := rose.Watch()
		if err != nil {
			return
		}
		defer func() {
			db.mutex.Lock()
			for _, watchers := range db.watchers {
				for _, watcher := range watchers {
					close(watcher)
				}
			}
			db.watchers = map[string][]chan struct{}{}
			db.mutex.Unlock()
		}()
		for {
			event, ok := <-eventCh
			// when db closed, the event will receive nil.
			if event == nil || !ok || db.closed.Load() {
				log.Println("The db is closed, so the watch channel is closed.")
				return
			}
			log.Printf("Get a new event: key%s \n", event.Key)

			db.mutex.RLock()
			go func() {
				defer db.mutex.RUnlock()

				watchers := db.watchers[string(event.Key)]
				for _, watcher := range watchers {
					watcher <- struct{}{}
				}
			}()
		}
	}()

	return db
}
