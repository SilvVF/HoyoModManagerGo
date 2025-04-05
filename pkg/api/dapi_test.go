package api

import (
	"hmm/pkg/log"
	"testing"
)

func TestLeagueApi(t *testing.T) {

	api := NewLeagueApi()

	c := api.Characters()

	log.LogDebugf("%v", c)

	t.Fail()
}

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
