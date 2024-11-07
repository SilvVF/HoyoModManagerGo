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
	path := filepath.Join(os.TempDir(), "rosedb-temp1"+strconv.Itoa(int(nameRand.Int63())))
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
	prefs := []Preference[int]{}

	for i := 0; i < 10; i++ {
		pref := store.GetInt(strconv.Itoa(i), i)
		prefs = append(prefs, pref)
	}

	for _, pref := range prefs {

		wg.Add(1)

		go func() {
			defer wg.Done()

			values, cancel := pref.Watch()
			for {
				_, ok := <-values
				if !ok {
					return
				}
				cancel()
			}
		}()
	}

	for i, pref := range prefs {
		pref.Set(i + 1)
	}

	wg.Wait()
	// let rosedb watch goroutine finsih otherwise it will panic
	time.Sleep(4 * time.Second)
	err := store.Close()
	if err != nil {
		t.Error(err)
	}
}

func TestRosePrefWatchersReceiveCorrectValues(t *testing.T) {

	nameRand := rand.NewSource(time.Now().UnixNano())
	path := filepath.Join(os.TempDir(), "rosedb-temp"+strconv.Itoa(int(nameRand.Int63())))
	defer os.RemoveAll(path)

	queueSize := uint64(500)

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
	time.Sleep(2 * time.Second)
	err := store.Close()
	if err != nil {
		t.Error(err)
	}
}

func TestRosePrefWatchersMultipleWatchersForKey(t *testing.T) {

	nameRand := rand.NewSource(time.Now().UnixNano())
	path := filepath.Join(os.TempDir(), "rosedb-temp-6"+strconv.Itoa(int(nameRand.Int63())))
	defer os.RemoveAll(path)

	prefDb := NewRosePrefDb(
		rosedb.Options{
			DirPath:           path,
			SegmentSize:       rosedb.DefaultOptions.SegmentSize,
			Sync:              rosedb.DefaultOptions.Sync,
			BytesPerSync:      rosedb.DefaultOptions.BytesPerSync,
			WatchQueueSize:    100,
			AutoMergeCronExpr: rosedb.DefaultOptions.AutoMergeCronExpr,
		},
	)

	store := NewPrefs(prefDb)

	wg := sync.WaitGroup{}

	size := 100
	wg.Add(size)

	pref := store.GetBoolean("test_pref", true)
	for i := 0; i < size; i++ {
		go func() {
			watcher, _ := pref.Watch()
			defer wg.Done()
			v, ok := <-watcher
			if !ok {
				return
			}
			if v != false {
				t.Errorf("value was incorrect received %v", v)
			} else {
				log.Println("correct value")
			}
		}()
	}

	time.Sleep(2 * time.Second)
	pref.Set(false)
	wg.Wait()

	err := store.Close()
	if err != nil {
		t.Error(err)
	}
}

func TestRosePrefWatchersMultipleCancelableForKey(t *testing.T) {

	nameRand := rand.NewSource(time.Now().UnixNano())
	path := filepath.Join(os.TempDir(), "rosedb-temp-6"+strconv.Itoa(int(nameRand.Int63())))
	defer os.RemoveAll(path)

	prefDb := NewRosePrefDb(
		rosedb.Options{
			DirPath:           path,
			SegmentSize:       rosedb.DefaultOptions.SegmentSize,
			Sync:              rosedb.DefaultOptions.Sync,
			BytesPerSync:      rosedb.DefaultOptions.BytesPerSync,
			WatchQueueSize:    100,
			AutoMergeCronExpr: rosedb.DefaultOptions.AutoMergeCronExpr,
		},
	)

	store := NewPrefs(prefDb)

	wg := sync.WaitGroup{}

	size := 100
	wg.Add(10)

	pref := store.GetBoolean("test_pref", true)
	for i := 1; i <= size; i++ {
		go func() {
			watcher, cancel := pref.Watch()
			if i%10 == 0 {
				defer wg.Done()
			}

			for {
				v, ok := <-watcher
				if !ok {
					return
				}
				if v != false {
					t.Errorf("value was incorrect received %v", v)
				} else {
					log.Println("correct value")
				}

				if i%10 == 0 {
					cancel()
				}
			}
		}()
	}

	time.Sleep(2 * time.Second)
	pref.Set(false)
	wg.Wait()

	err := store.Close()
	if err != nil {
		t.Error(err)
	}
}
