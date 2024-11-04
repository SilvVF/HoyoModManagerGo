package pref

import (
	"context"
	"hmm/pkg/util"
	"log"
	"path/filepath"
	"sync"

	"github.com/rosedblabs/rosedb/v2"
)

type Prefs struct {
	db PrefrenceDb
}

type PrefrenceDb interface {
	PutWatcher(chan<- []byte)
	RemoveWatcher(chan<- []byte)
	Put(key []byte, value []byte) error
	Get(key []byte) ([]byte, error)
	Delete(key []byte) error
	Exist(key []byte) (bool, error)
	Close() error
}

type Preference[T any] interface {
	Key() string
	Get() T
	Set(value T)
	IsSet() bool
	Delete()
	DefaultValue() T
	Watch() (<-chan T, func())
}

type PreferenceStore interface {
	GetString(key string, defaultValue string) Preference[string]
	GetLong(key string, defaultValue int64) Preference[int64]
	GetInt(key string, defaultValue int) Preference[int]
	GetFloat(key string, defaultValue float32) Preference[float32]
	GetBoolean(key string, defaultValue bool) Preference[bool]
	GetStringSlice(key string, defaultValue []string) Preference[[]string]
	Close() error
}

type RoseDbPrefs struct {
	*rosedb.DB
	cancel   context.CancelFunc
	watchers map[chan<- []byte]struct{}
	mutex    sync.Mutex
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

func createWatcher[T any](db PrefrenceDb, p Preference[T]) (<-chan T, func()) {

	out := make(chan T, 5)
	watch := make(chan []byte, 10)

	ctx, cancel := context.WithCancel(context.Background())

	go func() {

		defer close(out)

		db.PutWatcher(watch)

		for {
			select {
			case _, ok := <-watch:
				if ok {
					out <- p.Get()
				} else {
					return
				}
			case <-ctx.Done():
				db.RemoveWatcher(watch)
				close(watch)
				return
			}
		}
	}()

	return out, cancel
}
func NewPrefs(ctx context.Context) PreferenceStore {

	_, cancel := context.WithCancel(ctx)

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
		mutex:    sync.Mutex{},
	}

	go func() {
		eventCh, err := rose.Watch()
		if err != nil {
			return
		}
		for {
			select {
			case event := <-eventCh:
				// when db closed, the event will receive nil.
				if event == nil {
					log.Println("The db is closed, so the watch channel is closed.")
					return
				}
				// events can be captured here for processing
				log.Printf("Get a new event: key%s \n", event.Key)

				go func() {
					db.mutex.Lock()
					defer db.mutex.Unlock()

					for watcher := range db.watchers {
						watcher <- event.Key
					}
				}()
			case <-ctx.Done():
				db.mutex.Lock()
				for watcher := range db.watchers {
					close(watcher)
				}
				db.watchers = map[chan<- []byte]struct{}{}
				db.mutex.Unlock()
				return
			}
		}
	}()

	return &Prefs{
		db: db,
	}
}
