package core

import (
	"context"
	"hmm/pkg/log"
	"hmm/pkg/types"
	"hmm/pkg/util"
	"io/fs"
	"os"
	"path/filepath"
	"strings"

	"github.com/mholt/archives"
)

func getRootDir(path string) string {
	cleaned := filepath.Clean(path)
	segments := strings.Split(cleaned, string(filepath.Separator))

	if filepath.IsAbs(cleaned) {
		if len(segments) > 1 {
			return filepath.Join(string(filepath.Separator), segments[1])
		}
		return string(filepath.Separator)
	}
	return segments[0]
}

func ParseTextureDir(ctx context.Context, db *DbHelper, mod types.Mod, texture types.Texture) error {

	modArchive, err := util.GetModArchive(mod)
	if err != nil {
		return err
	}

	textureArchive, err := util.GetTextureArchive(mod, texture)
	outputTextures := filepath.Join(util.GetModDir(mod), "textures")
	if err != nil {
		return err
	}

	ctx, cancel := context.WithCancel(ctx)
	defer cancel()

	modIndex := make(map[string]struct{})
	texIndex := make(map[string]struct{})

	mfsys, err := archives.FileSystem(ctx, modArchive, nil)
	if err != nil {
		return err
	}
	tfsys, err := archives.FileSystem(ctx, textureArchive, nil)
	if err != nil {
		return err
	}

	// walk all files in texture archive and mod archive could be zip or reg dir
	// index by full path into map
	fs.WalkDir(mfsys, ".", func(path string, d fs.DirEntry, err error) error {
		modIndex[path] = struct{}{}
		return nil
	})
	fs.WalkDir(tfsys, ".", func(path string, d fs.DirEntry, err error) error {
		texIndex[path] = struct{}{}
		return nil
	})
	// for zips delete the "." with is just the root
	delete(modIndex, ".")
	delete(texIndex, ".")

	if len(modIndex) == 0 || len(texIndex) == 0 {
		return nil
	}

	first := ""
	for k := range modIndex {
		first = k
		break
	}

	relativeSet := map[string]struct{}{}
	basePrefix := getRootDir(first) + string(filepath.Separator)

	for path := range modIndex {
		if strings.HasPrefix(path, basePrefix) {
			rel := strings.TrimPrefix(path, basePrefix)
			rel = filepath.Clean(rel)
			relativeSet[rel] = struct{}{}
		}
	}

	// create a set of dirs that have a path relative to the mod
	// this assumes that the structure is root/texture name/relative path
	matchingFolders := map[string]struct{}{}

	for path := range texIndex {
		parts := strings.Split(filepath.Clean(path), string(filepath.Separator))
		if len(parts) < 3 {
			continue
		}

		base := filepath.Join(parts[0], parts[1])
		rel := filepath.Join(parts[2:]...)

		if _, exists := relativeSet[rel]; exists {
			matchingFolders[base] = struct{}{}
		}
	}

	// no need to split if only a single or nothing matches
	if len(matchingFolders) < 2 {
		return nil
	}

	for folder := range matchingFolders {
		// create a new texture for the matching path
		// find all files and dirs that match the rel path
		// then copy the files into a new texture
		common := []string{}
	outer:
		for s := range texIndex {

			segs := strings.Split(folder, string(filepath.Separator))
			segs2 := strings.Split(s, string(filepath.Separator))

			if len(segs2) < len(segs) {
				continue
			}

			for i, s := range segs {
				if s != segs2[i] {
					continue outer
				}
			}
			common = append(common, s)
		}
		//log.LogDebugf("\ncommon for %s \n\t-%s", folder, strings.Join(common, "\n\t-"))

		if len(common) == 0 {
			continue
		}
		name := filepath.Base(folder)

		if db != nil {
			if _, err := db.InsertTexture(types.Texture{
				Filename:       name,
				Enabled:        false,
				PreviewImages:  []string{},
				GbId:           texture.GbId,
				ModLink:        texture.ModLink,
				GbFileName:     texture.GbFileName,
				GbDownloadLink: texture.GbDownloadLink,
				ModId:          texture.ModId,
			}); err != nil {
				continue
			}
		}

		root := filepath.Join(outputTextures, name)
		os.MkdirAll(root, os.ModePerm)

		//log.LogDebugf("common: %v", common)

		for _, path := range common {
			log.LogDebugf("opening path: %s", path)
			f, err := tfsys.Open(path)
			if err != nil {
				break
			}
			defer f.Close()

			i, err := f.Stat()
			if err != nil {
				break
			}
			rel, err := filepath.Rel(folder, path)
			if err != nil {
				log.LogError(err.Error())
				break
			}

			//log.LogDebugf("rel: %s, %v", rel, i.IsDir())
			if !i.IsDir() {
				os.MkdirAll(filepath.Dir(filepath.Join(root, rel)), i.Mode())
				err := util.CopyFsFile(f, filepath.Join(root, rel), true)
				if err != nil {
					log.LogError(err.Error())
				}
			}
		}
	}

	//log.LogDebugf("indexed mod\n%s\n-------------------\nindexed tex\n%s", strings.Join(ms, "\n"), strings.Join(ts, "\n"))

	return nil
}
