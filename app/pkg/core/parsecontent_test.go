package core

import (
	"context"
	"hmm/pkg/types"
	"hmm/pkg/util"
	"testing"
)

func TestParse(t *testing.T) {

	ctx := context.Background()
	util.SetRootModDirFn(func() string {
		return "E:\\modmanager"
	})

	err := ParseTextureDir(
		ctx,
		nil,
		types.Mod{
			Filename:  "exce_-_ellen_joe_original_-",
			Character: "Ellen",
			Game:      types.ZZZ,
		},
		types.Texture{
			Filename:       "exce_ellen_pubic_hair",
			Enabled:        false,
			PreviewImages:  []string{},
			GbId:           0,
			ModLink:        "",
			GbFileName:     "",
			GbDownloadLink: "",
			ModId:          0,
			Id:             0,
		},
	)

	t.Error(err)
}
