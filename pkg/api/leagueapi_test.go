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
