package api

import (
	"hmm/pkg/log"
	"testing"
)

func TestWuwaApi(t *testing.T) {

	api := NewWutherWavesApi()

	c := api.Characters()

	log.LogDebugf("%v", c)

	t.Fail()
}

func TestZZZApi(t *testing.T) {

	api := NewZenlessZoneZeroApi()

	c := api.Characters()

	log.LogDebugf("%v", c)

	t.Fail()
}
