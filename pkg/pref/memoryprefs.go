package pref

import (
	"context"
	"errors"
	"log"
	"sync"
)

type MemoryPrefs struct {
	cancel    context.CancelFunc
	watchers  map[chan<- []byte]struct{}
	events    chan<- []byte
	prefs     map[string][]byte
	prefMutex sync.Mutex
	mutex     sync.RWMutex
}

func NewMemoryPrefs(ctx context.Context) PrefrenceDb {

	context, cancel := context.WithCancel(ctx)
	events := make(chan []byte, 100)

	db := &MemoryPrefs{
		cancel:    cancel,
		prefs:     map[string][]byte{},
		watchers:  map[chan<- []byte]struct{}{},
		prefMutex: sync.Mutex{},
		mutex:     sync.RWMutex{},
	}

	go func() {
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
			case event, ok := <-events:
				// when db closed, the event will receive nil.
				if event == nil || !ok {
					log.Println("The db is closed, so the watch channel is closed.")
					return
				}
				log.Printf("Get a new event: key%s \n", event)

				go func() {
					db.mutex.RLock()
					defer db.mutex.RUnlock()

					for watcher := range db.watchers {
						watcher <- event
					}
				}()
			case <-context.Done():
				close(events)
				return
			}
		}
	}()

	return db

}

func (mp *MemoryPrefs) Delete(key []byte) error {
	mp.prefMutex.Lock()
	defer mp.prefMutex.Unlock()

	delete(mp.prefs, string(key))
	go func() { mp.events <- key }()
	return nil
}

func (mp *MemoryPrefs) Exist(key []byte) (bool, error) {
	mp.prefMutex.Lock()
	defer mp.prefMutex.Unlock()

	_, ok := mp.prefs[string(key)]

	return ok, nil
}

func (mp *MemoryPrefs) Get(key []byte) ([]byte, error) {
	mp.prefMutex.Lock()
	defer mp.prefMutex.Unlock()

	value, ok := mp.prefs[string(key)]

	if !ok {
		return value, errors.New("value not set")
	}
	return value, nil
}

func (mp *MemoryPrefs) Put(key, value []byte) error {
	mp.prefMutex.Lock()
	defer mp.prefMutex.Unlock()

	mp.prefs[string(key)] = value
	go func() { mp.events <- key }()

	return nil
}

func (mp *MemoryPrefs) Close() error {
	mp.cancel()
	return nil
}

func (mp *MemoryPrefs) PutWatcher(watch chan<- []byte) {
	mp.mutex.Lock()
	mp.watchers[watch] = struct{}{}
	mp.mutex.Unlock()
}

func (mp *MemoryPrefs) RemoveWatcher(watch chan<- []byte) {
	mp.mutex.Lock()
	delete(mp.watchers, watch)
	mp.mutex.Unlock()
}
