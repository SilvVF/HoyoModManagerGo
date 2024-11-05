package pref

import (
	"context"
	"slices"
)

const (
	OUT_BUFFER_SIZE   = 5
	WATCH_BUFFER_SIZE = 5
)

type Prefs struct {
	db PrefrenceDb
}

type PrefrenceDb interface {
	Closed() bool
	PutWatcher(key []byte, update chan<- struct{})
	RemoveWatcher(key []byte, update chan<- struct{})
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

func createSliceWatcher[S ~[]E, E comparable](db PrefrenceDb, p Preference[S]) (<-chan S, func()) {
	out := make(chan S, OUT_BUFFER_SIZE)
	watch := make(chan struct{}, WATCH_BUFFER_SIZE)

	ctx, cancel := context.WithCancel(context.Background())
	db.PutWatcher([]byte(p.Key()), watch)

	go func() {
		defer close(out)

		var prev S
		for {
			select {
			case _, ok := <-watch:
				if !ok || db.Closed() {
					return
				}
				if new := p.Get(); !slices.Equal(new, prev) {
					out <- new
					prev = new
				}
			case <-ctx.Done():
				db.RemoveWatcher([]byte(p.Key()), watch)
				close(watch)
				return
			}
		}
	}()

	return out, cancel
}

func createWatcher[T comparable](db PrefrenceDb, p Preference[T]) (<-chan T, func()) {
	out := make(chan T, OUT_BUFFER_SIZE)
	watch := make(chan struct{}, WATCH_BUFFER_SIZE)

	ctx, cancel := context.WithCancel(context.Background())
	db.PutWatcher([]byte(p.Key()), watch)

	go func() {
		defer close(out)

		var prev T
		for {
			select {
			case _, ok := <-watch:
				if !ok || db.Closed() {
					return
				}
				if new := p.Get(); new != prev {
					out <- new
					prev = new
				}
			case <-ctx.Done():
				db.RemoveWatcher([]byte(p.Key()), watch)
				close(watch)
				return
			}
		}
	}()

	return out, cancel
}

func NewPrefs(db PrefrenceDb) PreferenceStore {
	return &Prefs{
		db: db,
	}
}
