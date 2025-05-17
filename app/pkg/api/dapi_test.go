package api

import (
	"fmt"
	"hmm/pkg/log"
	"hmm/pkg/types"
	"hmm/pkg/util"
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

func TestGenshinApi(t *testing.T) {

	api := NewGenshinApi()

	c := api.Characters()

	log.LogDebugf("%v",
		util.StringJoinFunc(c,
			"\n\t - ",
			func(e types.Character) string {
				return fmt.Sprintf("%v", e)
			}))

	t.Fail()
}

func TestZZZStarRailApi(t *testing.T) {

	api := NewStarRailApi()

	c := api.Characters()

	log.LogDebugf("%v", c)

	t.Fail()
}
