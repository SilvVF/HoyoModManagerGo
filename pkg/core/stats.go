package core

import (
	"hmm/pkg/types"
	"hmm/pkg/util"
	"io/fs"
	"os"
	"path/filepath"
	"strings"
)

type Stats struct {
	outputDirs map[types.Game]Preference[string]
}

func NewStats(outputDirs map[types.Game]Preference[string]) *Stats {
	return &Stats{
		outputDirs: outputDirs,
	}
}

func getDirSize(path string) (int64, error) {
	var totalSize int64

	err := filepath.Walk(path, func(_ string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		// Accumulate size only if it's a file
		if !info.IsDir() {
			totalSize += info.Size()
		}

		return nil
	})

	return totalSize, err
}

func (s *Stats) GetStats() (*types.DownloadStats, error) {

	res := &types.DownloadStats{
		TotalBytes: 0,
		Data:       [][]types.FileInfo{},
	}

	for game := range types.Games {

		gameDir := util.GetGameDir(types.Game(game))
		infos := []types.FileInfo{}
		total := int64(0)

		err := filepath.Walk(gameDir, func(path string, info fs.FileInfo, err error) error {

			relPath := strings.TrimPrefix(path, gameDir)
			segs := strings.Split(relPath, string(filepath.Separator))

			if !info.IsDir() || len(segs) > 2 {
				return nil
			}

			size := int64(0)
			if len(segs) == 2 {
				if s, err := getDirSize(path); err == nil {
					size = s
				}
			}

			total += size
			infos = append(infos, types.FileInfo{
				File:  path,
				Bytes: size,
			})
			return nil
		})

		if err != nil {
			return nil, err
		}

		res.TotalBytes += total
		res.Data = append(res.Data, infos)
	}

	return res, nil
}
