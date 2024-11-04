package pref

import (
	"context"
	"hmm/pkg/assert"
	"log"
	"sync"
	"time"

	"github.com/rosedblabs/rosedb/v2"
)

type RoseDbPrefs struct {
	*rosedb.DB
	watchers map[string][]chan<- struct{}
	mutex    sync.RWMutex
}

func (r *RoseDbPrefs) Close() error {
	// give time for the watch channel to broadcast any remaining values to stop panic
	// doesnt matter if this panics when the app is closed
	ctx, cncl := context.WithTimeout(context.Background(), 2*time.Second)
	defer cncl()

	<-ctx.Done()

	return r.DB.Close()
}

func (r *RoseDbPrefs) PutWatcher(key []byte, watch chan<- struct{}) {
	r.mutex.Lock()
	r.watchers[string(key)] = append(r.watchers[string(key)], watch)
	r.mutex.Unlock()
}

func removeElement[T comparable](slice []T, element T) []T {
	for i, v := range slice {
		if v == element {
			return append(slice[:i], slice[i+1:]...)
		}
	}
	return slice
}

func (r *RoseDbPrefs) RemoveWatcher(key []byte, watch chan<- struct{}) {
	r.mutex.Lock()
	values := r.watchers[string(key)]
	if len(values) == 1 {
		delete(r.watchers, string(key))
	} else {
		r.watchers[string(key)] = removeElement(values, watch)
	}
	r.mutex.Unlock()
}

func NewRosePrefDb(options rosedb.Options) PrefrenceDb {

	assert.Assert(options.WatchQueueSize > 0, "Key watch will not work if watch queue size is <= 0")

	rose, err := rosedb.Open(options)
	if err != nil {
		panic(err)
	}
	eventCh, err := rose.Watch()
	if err != nil {
		panic(err)
	}

	db := &RoseDbPrefs{
		DB:       rose,
		watchers: map[string][]chan<- struct{}{},
		mutex:    sync.RWMutex{},
	}

	go func() {
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
			db.watchers = map[string][]chan<- struct{}{}
			db.mutex.Unlock()
		}()

		for event := range eventCh {
			// when db closed, the event will receive nil.
			if event == nil {
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
