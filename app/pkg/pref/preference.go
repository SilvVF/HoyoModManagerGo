package pref

import (
	"bytes"
	"context"
	"encoding/binary"
	"encoding/gob"
	"hmm/pkg/log"
	"math"
	"strconv"
)

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

func (s *StringPreference) Set(value string) error {
	err := s.db.Put([]byte(s.key), []byte(value))
	if err != nil {
		log.LogError(err.Error())
	}
	return err
}

func (s *StringPreference) IsSet() bool {
	exist, err := s.db.Exist([]byte(s.key))
	return exist && err == nil
}

func (s *StringPreference) Delete() error {
	err := s.db.Delete([]byte(s.key))
	if err != nil {
		log.LogError(err.Error())
	}
	return err
}

func (s *StringPreference) DefaultValue() string {
	return s.defaultValue
}

func (s *StringPreference) Watch() (<-chan string, context.CancelFunc) {
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

func (p *IntPreference) Set(value int) error {
	err := p.db.Put([]byte(p.key), []byte(strconv.Itoa(value)))
	if err != nil {
		log.LogError(err.Error())
	}
	return err
}

func (p *IntPreference) IsSet() bool {
	exist, err := p.db.Exist([]byte(p.key))
	return exist && err == nil
}

func (p *IntPreference) Delete() error {
	err := p.db.Delete([]byte(p.key))
	if err != nil {
		log.LogError(err.Error())
	}
	return err
}

func (p *IntPreference) DefaultValue() int {
	return p.defaultValue
}

func (p *IntPreference) Watch() (<-chan int, context.CancelFunc) {
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

func (p *LongPreference) Set(value int64) error {
	b := make([]byte, 8)
	binary.LittleEndian.PutUint64(b, uint64(value))
	err := p.db.Put([]byte(p.key), b)
	if err != nil {
		log.LogError(err.Error())
	}
	return err
}

func (p *LongPreference) IsSet() bool {
	exist, err := p.db.Exist([]byte(p.key))
	return exist && err == nil
}

func (p *LongPreference) Delete() error {
	err := p.db.Delete([]byte(p.key))
	if err != nil {
		log.LogError(err.Error())
	}
	return err
}

func (p *LongPreference) DefaultValue() int64 {
	return p.defaultValue
}

func (p *LongPreference) Watch() (<-chan int64, context.CancelFunc) {
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

func (p *FloatPreference) Set(value float32) error {
	b := make([]byte, 8)
	binary.LittleEndian.PutUint32(b, math.Float32bits(value))
	err := p.db.Put([]byte(p.key), b)
	if err != nil {
		log.LogError(err.Error())
	}
	return err
}

func (p *FloatPreference) IsSet() bool {
	exist, err := p.db.Exist([]byte(p.key))
	return exist && err == nil
}

func (p *FloatPreference) Delete() error {
	err := p.db.Delete([]byte(p.key))
	if err != nil {
		log.LogError(err.Error())
	}
	return err
}

func (p *FloatPreference) DefaultValue() float32 {
	return p.defaultValue
}

func (p *FloatPreference) Watch() (<-chan float32, context.CancelFunc) {
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

func (p *BooleanPreference) Set(value bool) error {
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
	return err
}

func (p *BooleanPreference) IsSet() bool {
	exist, err := p.db.Exist([]byte(p.key))
	return exist && err == nil
}

func (p *BooleanPreference) Delete() error {
	err := p.db.Delete([]byte(p.key))
	if err != nil {
		log.LogError(err.Error())
	}
	return err
}

func (p *BooleanPreference) DefaultValue() bool {
	return p.defaultValue
}

func (p *BooleanPreference) Watch() (<-chan bool, context.CancelFunc) {
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

func (p *StringSlicePreference) Set(value []string) error {
	buf := &bytes.Buffer{}
	gob.NewEncoder(buf).Encode(value)
	bs := buf.Bytes()

	err := p.db.Put([]byte(p.key), bs)
	if err != nil {
		log.LogError(err.Error())
	}
	return err
}

func (p *StringSlicePreference) IsSet() bool {
	exist, err := p.db.Exist([]byte(p.key))
	return exist && err == nil
}

func (p *StringSlicePreference) Delete() error {
	err := p.db.Delete([]byte(p.key))
	if err != nil {
		log.LogError(err.Error())
	}
	return err
}

func (p *StringSlicePreference) DefaultValue() []string {
	return p.defaultValue
}

func (p *StringSlicePreference) Watch() (<-chan []string, context.CancelFunc) {
	return createSliceWatcher(p.db, p)
}

func (p *Prefs) GetStringSlice(key string, defaultValue []string) Preference[[]string] {
	return &StringSlicePreference{
		key:          key,
		defaultValue: defaultValue,
		db:           p.db,
	}
}
