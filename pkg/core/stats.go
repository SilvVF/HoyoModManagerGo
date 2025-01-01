package core

import (
	"hmm/pkg/pref"
	"hmm/pkg/types"
	"hmm/pkg/util"
	"io/fs"
	"os"
	"path/filepath"
	"strings"
)

type Stats struct {
	outputDirs map[types.Game]pref.Preference[string]
}

func NewStats(outputDirs map[types.Game]pref.Preference[string]) *Stats {
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
		if !info.IsDir() {
			totalSize += info.Size()
		}

		return nil
	})

	return totalSize, err
}

func (s *Stats) GetStats() (*types.DownloadStats, error) {

	bytes, dirInfos, err := getDirInfo(util.GetRootModDir())
	if err != nil && err != ErrStopWalkingDirError {
		return nil, err
	}
	res := &types.DownloadStats{
		TotalBytes: bytes,
		Data:       [][]types.FileInfo{dirInfos},
	}

	for _, game := range types.Games {

		gameDir := util.GetGameDir(game)
		_, dirInfos, err := getDirInfo(gameDir)

		if err != nil && err != ErrStopWalkingDirError {
			return nil, err
		}
		res.Data = append(res.Data, dirInfos)
	}

	return res, nil
}

func getDirInfo(root string) (int64, []types.FileInfo, error) {
	infos := []types.FileInfo{}
	total := int64(0)

	err := filepath.WalkDir(root, func(path string, d fs.DirEntry, err error) error {

		relPath := strings.TrimPrefix(path, root)
		segs := strings.Split(relPath, string(filepath.Separator))

		if len(segs) > 2 || !d.IsDir() {
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

	return total, infos, err
}
