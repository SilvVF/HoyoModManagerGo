package core

import (
	"bytes"
	"encoding/binary"
	"encoding/gob"
	"fmt"
	"hmm/pkg/log"
	"hmm/pkg/util"
	"math"
	"path/filepath"
	"strconv"
	"sync"
	"time"

	"github.com/rosedblabs/rosedb/v2"
)

type KeyChangeEvent struct {
	key   []byte
	value []byte
}
type KeyChangedListener = chan<- *KeyChangeEvent

type Prefs struct {
	db PrefrenceDb
}

type PrefrenceDb interface {
	done() chan struct{}
	events() <-chan *KeyChangeEvent
	onKeyChanged(*KeyChangeEvent)
	Put(key []byte, value []byte) error
	Get(key []byte) ([]byte, error)
	Delete(key []byte) error
	Exist(key []byte) (bool, error)
	Close() error
	RegisterListener(listener KeyChangedListener)
	UnregisterListener(listener KeyChangedListener)
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
	listeners map[KeyChangedListener]struct{}
	mutex     sync.Mutex
	dc        chan struct{} // Add done channel for cleanup
	wg        sync.WaitGroup
}

func (r *RoseDbPrefs) done() chan struct{} {
	return r.dc
}

func (r *RoseDbPrefs) onKeyChanged(event *KeyChangeEvent) {
	r.mutex.Lock()
	defer r.mutex.Unlock()

	if event == nil {
		log.LogDebug("Closing all listeners")
		for listener := range r.listeners {
			close(listener)
		}
		r.listeners = make(map[KeyChangedListener]struct{})
		return
	}

	const timeout = 100 * time.Millisecond
	var closedListeners []KeyChangedListener

	for listener := range r.listeners {
		select {
		case listener <- event:
			log.LogPrintf("broadcast event to key: %s", string(event.key))
		case <-time.After(timeout):
			log.LogDebugf("listener was blocked key: %s", string(event.key))
			closedListeners = append(closedListeners, listener)
		}
	}

	for _, closedListener := range closedListeners {
		delete(r.listeners, closedListener)
		close(closedListener)
	}
}

func (r *RoseDbPrefs) RegisterListener(listener KeyChangedListener) {
	r.mutex.Lock()
	defer r.mutex.Unlock()

	r.listeners[listener] = struct{}{}
}

func (r *RoseDbPrefs) UnregisterListener(listener KeyChangedListener) {
	r.mutex.Lock()
	defer r.mutex.Unlock()

	delete(r.listeners, listener)
}

func (r *RoseDbPrefs) events() <-chan *KeyChangeEvent {
	keyChanged := make(chan *KeyChangeEvent, 100)

	r.wg.Add(1)
	go func() {
		defer r.wg.Done()
		defer func() {
			r.mutex.Lock()
			close(keyChanged)
			r.mutex.Unlock()
		}()

		eventCh, err := r.Watch()
		if err != nil {
			log.LogError(err.Error())
			return
		}

		for {
			select {
			case event, ok := <-eventCh:
				if !ok || event == nil {
					return
				}
				// Make a copy of the event data to prevent races
				eventCopy := &KeyChangeEvent{
					key:   append([]byte(nil), event.Key...),
					value: append([]byte(nil), event.Value...),
				}
				select {
				case keyChanged <- eventCopy:
				case <-r.dc:
					return
				}
			case <-r.dc:
				return
			}
		}
	}()

	return keyChanged
}

func (r *RoseDbPrefs) Close() error {
	close(r.dc)
	r.wg.Wait()
	var listenersToClose []KeyChangedListener
	r.mutex.Lock()
	for listener := range r.listeners {
		listenersToClose = append(listenersToClose, listener)
	}
	r.listeners = make(map[KeyChangedListener]struct{})
	r.mutex.Unlock()
	for _, listener := range listenersToClose {
		close(listener)
	}
	return r.DB.Close()
}

func createWatcher[T any](db PrefrenceDb, p Preference[T]) (<-chan T, func()) {
	send := make(chan T, 10)
	events := make(chan *KeyChangeEvent, 10)

	done := make(chan struct{})
	var wg sync.WaitGroup
	wg.Add(1)

	db.RegisterListener(events)

	go func() {
		defer wg.Done()
		defer func() {
			db.UnregisterListener(events)
			close(events)
			close(send)
		}()

		for {
			select {
			case event, ok := <-events:
				if !ok || event == nil {
					return
				}
				if string(event.key) == p.Key() {
					value := p.Get() // Get the value outside the select to prevent deadlock
					select {
					case send <- value:
					case <-done:
						return
					default:
						// Skip if channel is full rather than blocking
						log.LogDebug("Skipping value update due to full channel")
					}
				}
			case <-done:
				return
			case <-db.done():
				return
			}
		}
	}()

	return send, func() {
		close(done)
		wg.Wait()
	}
}

func NewPrefs(debug bool) PreferenceStore {
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
	var db PrefrenceDb = &RoseDbPrefs{
		DB:        rose,
		listeners: map[KeyChangedListener]struct{}{},
		mutex:     sync.Mutex{},
		dc:        make(chan struct{}),
		wg:        sync.WaitGroup{},
	}

	go func() {
		log.LogDebug("starting keywatch for db")
		eventChan := db.events()
		log.LogDebug("received event channel")
		for {
			select {
			case event, ok := <-eventChan:
				if !ok || event == nil {
					log.LogDebug("event channel was closed")
					return
				}
				log.LogDebug(fmt.Sprintf("event received key: %s", string(event.key)))
				db.onKeyChanged(event)
			case <-db.done():
				return
			}
		}
	}()

	return &Prefs{
		db: db,
	}
}

type StringPreference struct {
	db           PrefrenceDb
	key          string
	defaultValue string
}

func (p *Prefs) Close() error {
	log.LogDebug("Closing prefs db")
	return p.db.Close()
}

func (s *StringPreference) Key() string {
	return s.key
}

func (s *StringPreference) Get() string {
	v, err := s.db.Get([]byte(s.key))
	if err != nil {
		return s.defaultValue
	}
	return string(v)
}

func (s *StringPreference) Set(value string) {
	err := s.db.Put([]byte(s.key), []byte(value))
	if err != nil {
		log.LogError(err.Error())
	}
}

func (s *StringPreference) IsSet() bool {
	exist, err := s.db.Exist([]byte(s.key))
	return exist && err == nil
}

func (s *StringPreference) Delete() {
	err := s.db.Delete([]byte(s.key))
	if err != nil {
		log.LogError(err.Error())
	}
}

func (s *StringPreference) DefaultValue() string {
	return s.defaultValue
}

func (s *StringPreference) Watch() (<-chan string, func()) {
	return createWatcher(s.db, s)
}

func (p *Prefs) GetString(key string, defaultValue string) Preference[string] {
	return &StringPreference{
		key:          key,
		defaultValue: defaultValue,
		db:           p.db,
	}
}

// ===========================================

type IntPreference struct {
	db           PrefrenceDb
	key          string
	defaultValue int
}

func (p *IntPreference) Key() string {
	return p.key
}

func (p *IntPreference) Get() int {
	v, err := p.db.Get([]byte(p.key))
	if err != nil {
		return p.defaultValue
	}
	i, err := strconv.Atoi(string(v))
	if err != nil {
		return p.defaultValue
	}
	return i
}

func (p *IntPreference) Set(value int) {
	err := p.db.Put([]byte(p.key), []byte(strconv.Itoa(value)))
	if err != nil {
		log.LogError(err.Error())
	}
}

func (p *IntPreference) IsSet() bool {
	exist, err := p.db.Exist([]byte(p.key))
	return exist && err == nil
}

func (p *IntPreference) Delete() {
	err := p.db.Delete([]byte(p.key))
	if err != nil {
		log.LogError(err.Error())
	}
}

func (p *IntPreference) DefaultValue() int {
	return p.defaultValue
}

func (p *IntPreference) Watch() (<-chan int, func()) {
	return createWatcher(p.db, p)
}

func (p *Prefs) GetInt(key string, defaultValue int) Preference[int] {
	return &IntPreference{
		key:          key,
		defaultValue: defaultValue,
		db:           p.db,
	}
}

// =============================================================================

type LongPreference struct {
	db           PrefrenceDb
	key          string
	defaultValue int64
}

func (p *LongPreference) Key() string {
	return p.key
}

func (p *LongPreference) Get() int64 {
	v, err := p.db.Get([]byte(p.key))
	if err != nil {
		return p.defaultValue
	}
	return int64(binary.LittleEndian.Uint64(v))
}

func (p *LongPreference) Set(value int64) {
	b := make([]byte, 8)
	binary.LittleEndian.PutUint64(b, uint64(value))
	err := p.db.Put([]byte(p.key), b)
	if err != nil {
		log.LogError(err.Error())
	}
}

func (p *LongPreference) IsSet() bool {
	exist, err := p.db.Exist([]byte(p.key))
	return exist && err == nil
}

func (p *LongPreference) Delete() {
	err := p.db.Delete([]byte(p.key))
	if err != nil {
		log.LogError(err.Error())
	}
}

func (p *LongPreference) DefaultValue() int64 {
	return p.defaultValue
}

func (p *LongPreference) Watch() (<-chan int64, func()) {
	return createWatcher(p.db, p)
}

func (p *Prefs) GetLong(key string, defaultValue int64) Preference[int64] {
	return &LongPreference{
		key:          key,
		defaultValue: defaultValue,
		db:           p.db,
	}
}

// =============================================================

type FloatPreference struct {
	db           PrefrenceDb
	key          string
	defaultValue float32
}

func (p *FloatPreference) Key() string {
	return p.key
}

func (p *FloatPreference) Get() float32 {
	v, err := p.db.Get([]byte(p.key))
	if err != nil {
		return p.defaultValue
	}
	return float32(binary.LittleEndian.Uint32(v))
}

func (p *FloatPreference) Set(value float32) {
	b := make([]byte, 8)
	binary.LittleEndian.PutUint32(b, math.Float32bits(value))
	err := p.db.Put([]byte(p.key), b)
	if err != nil {
		log.LogError(err.Error())
	}
}

func (p *FloatPreference) IsSet() bool {
	exist, err := p.db.Exist([]byte(p.key))
	return exist && err == nil
}

func (p *FloatPreference) Delete() {
	err := p.db.Delete([]byte(p.key))
	if err != nil {
		log.LogError(err.Error())
	}
}

func (p *FloatPreference) DefaultValue() float32 {
	return p.defaultValue
}

func (p *FloatPreference) Watch() (<-chan float32, func()) {
	return createWatcher(p.db, p)
}

func (p *Prefs) GetFloat(key string, defaultValue float32) Preference[float32] {
	return &FloatPreference{
		key:          key,
		defaultValue: defaultValue,
		db:           p.db,
	}
}

// ================================================================================

type BooleanPreference struct {
	db           PrefrenceDb
	key          string
	defaultValue bool
}

func (p *BooleanPreference) Key() string {
	return p.key
}

func (p *BooleanPreference) Get() bool {
	v, err := p.db.Get([]byte(p.key))
	if err != nil {
		return p.defaultValue
	}
	return v[0] == 1
}

func (p *BooleanPreference) Set(value bool) {
	var b []byte
	if value {
		b = []byte{1}
	} else {
		b = []byte{0}
	}
	err := p.db.Put([]byte(p.key), b)
	if err != nil {
		log.LogError(err.Error())
	}
}

func (p *BooleanPreference) IsSet() bool {
	exist, err := p.db.Exist([]byte(p.key))
	return exist && err == nil
}

func (p *BooleanPreference) Delete() {
	err := p.db.Delete([]byte(p.key))
	if err != nil {
		log.LogError(err.Error())
	}
}

func (p *BooleanPreference) DefaultValue() bool {
	return p.defaultValue
}

func (p *BooleanPreference) Watch() (<-chan bool, func()) {
	return createWatcher(p.db, p)
}

func (p *Prefs) GetBoolean(key string, defaultValue bool) Preference[bool] {
	return &BooleanPreference{
		key:          key,
		defaultValue: defaultValue,
		db:           p.db,
	}
}

// ==========================

type StringSlicePreference struct {
	db           PrefrenceDb
	key          string
	defaultValue []string
}

func (p *StringSlicePreference) Key() string {
	return p.key
}

func (p *StringSlicePreference) Get() []string {
	v, err := p.db.Get([]byte(p.key))
	if err != nil {
		return p.defaultValue
	}
	strs := []string{}
	buf := &bytes.Buffer{}
	_, err = buf.Write(v)
	if err != nil {
		log.LogError(err.Error())
		return p.defaultValue
	}
	gob.NewDecoder(buf).Decode(&strs)
	return strs
}

func (p *StringSlicePreference) Set(value []string) {
	buf := &bytes.Buffer{}
	gob.NewEncoder(buf).Encode(value)
	bs := buf.Bytes()

	err := p.db.Put([]byte(p.key), bs)
	if err != nil {
		log.LogError(err.Error())
	}
}

func (p *StringSlicePreference) IsSet() bool {
	exist, err := p.db.Exist([]byte(p.key))
	return exist && err == nil
}

func (p *StringSlicePreference) Delete() {
	err := p.db.Delete([]byte(p.key))
	if err != nil {
		log.LogError(err.Error())
	}
}

func (p *StringSlicePreference) DefaultValue() []string {
	return p.defaultValue
}

func (p *StringSlicePreference) Watch() (<-chan []string, func()) {
	return createWatcher(p.db, p)
}

func (p *Prefs) GetStringSlice(key string, defaultValue []string) Preference[[]string] {
	return &StringSlicePreference{
		key:          key,
		defaultValue: defaultValue,
		db:           p.db,
	}
}
