package pref

import (
	"context"
	"errors"
	"log"
	"sync"
	"sync/atomic"
)

type MemoryStore struct {
	cancel    context.CancelFunc
	closed    *atomic.Bool
	watchers  map[string][]chan struct{}
	events    chan<- []byte
	prefs     map[string][]byte
	prefMutex sync.Mutex
	mutex     sync.RWMutex
}

func NewInMemoryStore(ctx context.Context) PrefrenceDb {

	context, cancel := context.WithCancel(ctx)
	events := make(chan []byte, 100)

	db := &MemoryStore{
		cancel:    cancel,
		prefs:     map[string][]byte{},
		watchers:  map[string][]chan struct{}{},
		prefMutex: sync.Mutex{},
		closed:    &atomic.Bool{},
		mutex:     sync.RWMutex{},
	}

	go func() {
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

					for _, watcher := range db.watchers[string(event)] {
						watcher <- struct{}{}
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

func (mp *MemoryStore) Closed() bool {
	return mp.closed.Load()
}

func (mp *MemoryStore) Delete(key []byte) error {
	mp.prefMutex.Lock()
	defer mp.prefMutex.Unlock()

	delete(mp.prefs, string(key))
	go func() { mp.events <- key }()
	return nil
}

func (mp *MemoryStore) Exist(key []byte) (bool, error) {
	mp.prefMutex.Lock()
	defer mp.prefMutex.Unlock()

	_, ok := mp.prefs[string(key)]

	return ok, nil
}

func (mp *MemoryStore) Get(key []byte) ([]byte, error) {
	mp.prefMutex.Lock()
	defer mp.prefMutex.Unlock()

	value, ok := mp.prefs[string(key)]

	if !ok {
		return value, errors.New("value not set")
	}
	return value, nil
}

func (mp *MemoryStore) Put(key, value []byte) error {
	mp.prefMutex.Lock()
	defer mp.prefMutex.Unlock()

	mp.prefs[string(key)] = value
	go func() { mp.events <- key }()

	return nil
}

func (mp *MemoryStore) Close() error {
	mp.closed.Swap(true)
	mp.cancel()
	return nil
}

func (mp *MemoryStore) CreateWatcher(key []byte) <-chan struct{} {
	mp.mutex.Lock()
	defer mp.mutex.Unlock()

	watcher := make(chan struct{}, WATCH_BUFFER_SIZE)
	mp.watchers[string(key)] = append(mp.watchers[string(key)], watcher)

	return watcher
}

func (mp *MemoryStore) RemoveWatcher(key []byte, watcher <-chan struct{}) {
	mp.mutex.Lock()
	defer mp.mutex.Unlock()

	values := mp.watchers[string(key)]
	if len(values) == 1 {
		delete(mp.watchers, string(key))
		close(values[0])
	} else {
		for i, v := range values {
			if v == watcher {
				mp.watchers[string(key)] = append(values[:i], values[i+1:]...)
				close(v)
			}
		}
	}
}
