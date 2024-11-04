package pref

import (
	"log"
	"math/rand"
	"os"
	"path/filepath"
	"strconv"
	"sync"
	"testing"
	"time"

	"github.com/rosedblabs/rosedb/v2"
)

func TestRosePrefWatchersCanceledOnClose(t *testing.T) {

	nameRand := rand.NewSource(time.Now().UnixNano())
	path := filepath.Join(os.TempDir(), "rosedb-temp"+strconv.Itoa(int(nameRand.Int63())))
	defer os.RemoveAll(path)

	prefDb := NewRosePrefDb(
		rosedb.Options{
			DirPath:           path,
			SegmentSize:       rosedb.DefaultOptions.SegmentSize,
			Sync:              rosedb.DefaultOptions.Sync,
			BytesPerSync:      rosedb.DefaultOptions.BytesPerSync,
			WatchQueueSize:    300,
			AutoMergeCronExpr: rosedb.DefaultOptions.AutoMergeCronExpr,
		},
	)

	store := NewPrefs(prefDb)

	wg := sync.WaitGroup{}

	for i := 0; i < 1000; i++ {

		pref := store.GetInt(strconv.Itoa(i), i)
		wg.Add(1)

		go func() {
			defer wg.Done()
			values, _ := pref.Watch()

			for {
				_, ok := <-values
				if !ok {
					return
				}
			}
		}()
	}

	err := store.Close()
	if err != nil {
		t.Error(err)
	}

	wg.Wait()
}

func TestRosePrefWatchersRemoval(t *testing.T) {

	nameRand := rand.NewSource(time.Now().UnixNano())
	path := filepath.Join(os.TempDir(), "rosedb-temp"+strconv.Itoa(int(nameRand.Int63())))
	defer os.RemoveAll(path)

	queueSize := uint64(1000)

	prefDb := NewRosePrefDb(
		rosedb.Options{
			DirPath:           path,
			SegmentSize:       rosedb.DefaultOptions.SegmentSize,
			Sync:              rosedb.DefaultOptions.Sync,
			BytesPerSync:      rosedb.DefaultOptions.BytesPerSync,
			WatchQueueSize:    queueSize,
			AutoMergeCronExpr: rosedb.DefaultOptions.AutoMergeCronExpr,
		},
	)

	store := NewPrefs(prefDb)

	wg := sync.WaitGroup{}
	prefs := []Preference[int]{}

	for i := 0; i < int(queueSize)/2; i++ {
		pref := store.GetInt(strconv.Itoa(i), i)
		pref.Set(i)
		prefs = append(prefs, pref)
	}

	for i, pref := range prefs {

		wg.Add(1)
		expectedNext := i + 1
		values, cancel := pref.Watch()

		go func() {
			defer wg.Done()
			for {
				v, ok := <-values
				if !ok {
					log.Printf("received cancellation %s", pref.Key())
					return
				} else if v != expectedNext {
					t.Errorf("value from watch unexpected v: %d != next: %d", v, expectedNext)
				} else {
					log.Printf("received value expected value %d", v)
					cancel()
				}
			}
		}()
	}

	for i, pref := range prefs {
		pref.Set(i + 1)
	}

	wg.Wait()

	err := store.Close()
	if err != nil {
		t.Error(err)
	}
}

func TestRosePrefWatchersReceiveCorrectValues(t *testing.T) {

	nameRand := rand.NewSource(time.Now().UnixNano())
	path := filepath.Join(os.TempDir(), "rosedb-temp"+strconv.Itoa(int(nameRand.Int63())))
	defer os.RemoveAll(path)

	queueSize := uint64(1000)

	prefDb := NewRosePrefDb(
		rosedb.Options{
			DirPath:           path,
			SegmentSize:       rosedb.DefaultOptions.SegmentSize,
			Sync:              rosedb.DefaultOptions.Sync,
			BytesPerSync:      rosedb.DefaultOptions.BytesPerSync,
			WatchQueueSize:    queueSize,
			AutoMergeCronExpr: rosedb.DefaultOptions.AutoMergeCronExpr,
		},
	)

	store := NewPrefs(prefDb)

	wg := sync.WaitGroup{}
	prefs := []Preference[int]{}

	for i := 0; i < int(queueSize)/2; i++ {
		pref := store.GetInt(strconv.Itoa(i), i)
		pref.Set(i)
		prefs = append(prefs, pref)
	}

	for i, pref := range prefs {
		wg.Add(1)

		go func() {
			defer wg.Done()

			expectedNext := i + 1
			values, _ := pref.Watch()

			for {
				v, ok := <-values
				if !ok {
					return
				} else if v != expectedNext {
					t.Errorf("value from watch unexpected v: %d != next: %d", v, expectedNext)
				} else {
					log.Printf("received value expected value %d", v)
					return
				}
			}
		}()
	}

	for i, pref := range prefs {
		pref.Set(i + 1)
	}

	wg.Wait()

	err := store.Close()
	if err != nil {
		t.Error(err)
	}
}
