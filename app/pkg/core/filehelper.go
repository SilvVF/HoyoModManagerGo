package core

import (
	"bufio"
	"context"
	"errors"
	"fmt"
	"hmm/pkg/log"
	"hmm/pkg/util"
	"io"
	"io/fs"
	"os"
	"path/filepath"
	"strings"

	"github.com/klauspost/compress/flate"
	"github.com/klauspost/compress/zip"
	"github.com/mholt/archives"

	"gopkg.in/ini.v1"
)

var (
	ErrNoCompressedFiles   = errors.New("no compressed files found")
	ErrUnknownArchiveType  = errors.New("unknown archive file type")
	ErrInvalidPath         = errors.New("archived file contains invalid path")
	ErrInvalidHead         = errors.New("archived file contains invalid header file")
	ErrStopWalkingDirError = errors.New("stop walking normally")
)

// WalkAndRezip walks through the directory, finds ZIP files, extracts and recompresses them
func WalkAndRezip(root string, ctx context.Context, onProgress func(total int, complete int)) error {

	rezipWithNewCompression := func(path string) error {
		t, _ := os.MkdirTemp(os.TempDir(), "")
		_, err := archiveExtract(path, t, false, true, func(progress int64, total int64) {})
		if err != nil {
			return nil
		}

		newZip := strings.TrimSuffix(path, ".zip") + "_new.zip"
		fmt.Println("extraxting to " + newZip + "from " + path)
		err = ZipFolder(t, newZip, func(total, complete int) {})
		if err != nil {
			return nil
		}
		err = os.Rename(newZip, path)
		if err != nil {
			return nil
		}

		fmt.Println("Recompressed and cleaned:", path)
		return os.RemoveAll(t)
	}

	paths := []string{}
	err := filepath.WalkDir(root, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if filepath.Ext(path) == ".zip" {
			paths = append(paths, path)
		}
		return nil
	})

	if err != nil {
		return err
	}

	failed := []error{}
	total := len(paths)
	onProgress(total, 0)

	for i, path := range paths {

		if ctx.Err() != nil {
			return ctx.Err()
		}

		if err := rezipWithNewCompression(path); err != nil {
			failed = append(failed, err)
		}
		onProgress(total, i+1)
	}

	return errors.Join(failed...)
}

func ZipFolder(srcDir, destZip string, onProgress func(total int, complete int)) error {

	err := os.MkdirAll(filepath.Dir(destZip), os.ModePerm)
	if err != nil {
		return err
	}

	zipFile, err := os.Create(destZip)
	if err != nil {
		return err
	}
	defer zipFile.Close()

	zipWriter := zip.NewWriter(zipFile)
	defer zipWriter.Close()

	zipWriter.RegisterCompressor(zip.Deflate, func(w io.Writer) (io.WriteCloser, error) {
		return flate.NewWriter(w, flate.BestCompression)
	})

	total := 0
	complete := 0

	err = filepath.WalkDir(srcDir, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if path == srcDir {
			return nil
		}
		total += 1
		return nil
	})

	if err != nil {
		return err
	}

	onProgress(total, complete)

	return filepath.Walk(srcDir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if info.IsDir() {
			return nil
		}

		relPath, err := filepath.Rel(srcDir, path)
		if err != nil {
			return err
		}

		header, err := zip.FileInfoHeader(info)
		if err != nil {
			return err
		}
		header.Name = relPath
		header.Method = zip.Deflate

		writer, err := zipWriter.CreateHeader(header)
		if err != nil {
			return err
		}

		file, err := os.Open(path)
		if err != nil {
			return err
		}
		defer file.Close()

		_, err = io.Copy(writer, file)
		complete += 1

		onProgress(total, complete)

		return err
	})
}

type Entry struct {
	Path string
	Root string
}

func hasUniformRoot(contents []string) bool {
	var entries []Entry
	anyDir := false

	for _, entry := range contents {

		if filepath.Ext(entry) == "" {
			anyDir = true
		}

		root := filepath.Base(filepath.Dir(entry))
		entries = append(entries, Entry{Path: entry, Root: root})
	}

	if len(entries) == 0 {
		return true
	}

	if !anyDir {
		return false
	}

	// Get the root of the first entry
	firstRoot := entries[0].Root

	// Check if all other entries have the same root
	for _, entry := range entries[1:] {
		if entry.Root != firstRoot {
			return false
		}
	}

	return true
}

func getUncompressedSize(ctx context.Context, archivePath string) (int64, []string, error) {

	total := int64(0)
	contents := []string{}

	fsys, err := archives.FileSystem(ctx, archivePath, nil)
	if err != nil {
		return total, contents, err
	}

	err = fs.WalkDir(fsys, ".", func(path string, d fs.DirEntry, err error) error {

		if err != nil {
			return err
		}

		if d.IsDir() {
			return nil
		}

		i, err := d.Info()
		if err != nil {
			return err
		}
		total += i.Size()

		contents = append(contents, path)

		return nil
	})
	if err != nil {
		return total, contents, err
	}

	return total, contents, err
}

func archiveExtract(
	archivePath, path string,
	unifyRoot, overwrite bool,
	onProgress func(progress int64, total int64),
) (string, error) {
	ctx := context.Background()

	total, contents, _ := getUncompressedSize(ctx, archivePath)
	progress := int64(0)

	basePath := path
	if !hasUniformRoot(contents) && unifyRoot {
		basePath = filepath.Join(path, filepath.Base(path))
	}

	file, err := os.Open(archivePath)
	if err != nil {
		return "", err
	}
	defer file.Close()

	_, err = file.Seek(0, io.SeekStart)
	if err != nil {
		return "", err
	}

	format, stream, err := archives.Identify(ctx, archivePath, file)

	log.LogDebugf("type = %s, path = %s", format.Extension(), basePath)

	if err != nil {
		log.LogDebug("err identifying")
		return "", err
	}

	_, err = file.Seek(0, io.SeekStart)
	if err != nil {
		return "", err
	}

	ex, ok := format.(archives.Extractor)
	if !ok {
		return "", errors.New("nothing to extract")
	}

	if onProgress != nil {
		onProgress(progress, total)
	}

	err = ex.Extract(ctx, stream, func(ctx context.Context, f archives.FileInfo) error {

		name := filepath.Clean(f.NameInArchive)
		dirname := filepath.Join(basePath, filepath.Dir(name))

		if f.IsDir() {
			return nil
		}

		out := filepath.Join(dirname, filepath.Base(name))
		if exists, _ := util.FileExists(out); exists && !overwrite {
			return nil
		}

		os.MkdirAll(dirname, 0755)

		file, err := f.Open()
		if err != nil {
			return err
		}
		defer file.Close()
		b, err := io.ReadAll(file)
		if err != nil {
			return err
		}

		err = os.WriteFile(out, b, 0644)
		if err != nil {
			return err
		}

		progress += f.Size()

		if onProgress != nil {
			onProgress(progress, total)
		}

		return nil
	})

	return basePath, err
}

func findUniqueDirName(basePath string) string {
	if _, err := os.Stat(basePath); os.IsNotExist(err) {
		return basePath
	}
	dir := basePath
	count := 1
	for count < 10 {
		newDir := fmt.Sprintf("%s (%d)", dir, count)
		if _, err := os.Stat(newDir); os.IsNotExist(err) {
			return newDir
		}
		count++
	}
	return basePath
}

// overwrites config to the file appendTo and returns the new content as a string
func OverwriteIniFiles(r io.ReadCloser, cfg *ini.File) (string, error) {

	scanner := bufio.NewScanner(r)
	scanner.Split(bufio.ScanLines)

	sb := strings.Builder{}
	for scanner.Scan() {
		line := scanner.Text()

		if secRegex.MatchString(line) {

			sb.WriteString(line)
			sb.WriteRune('\n')

			matches := secRegex.FindStringSubmatch(line)
			secName := strings.TrimRight(strings.TrimLeft(matches[0], "["), "]")

			sec, err := cfg.GetSection(secName)
			if err != nil {
				continue
			}
			log.LogDebugf("SEARCHING FOR %v", sec.KeyStrings())

			for scanner.Scan() {
				line = scanner.Text()
				split := strings.SplitN(line, "=", 2)

				log.LogDebugf("split %v", split)

				if len(split) <= 1 {
					sb.WriteString(line)
					sb.WriteRune('\n')
					break
				}

				subName := strings.TrimSpace(split[0])

				if key, _ := sec.GetKey(subName); key != nil {
					log.LogDebugf("Writing KEY=%s VALUE=%s", subName, key.String())
					sb.WriteString(fmt.Sprintf("%s = %s\n", subName, key.String()))
				} else {
					log.LogDebugf("Skipping KEY=%s", subName)
					sb.WriteString(line)
					sb.WriteRune('\n')
				}
			}
		} else {
			sb.WriteString(line)
			sb.WriteRune('\n')
		}
	}

	return sb.String(), nil
}
