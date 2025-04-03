package core

import (
	"bufio"
	"context"
	"errors"
	"fmt"
	"hmm/pkg/log"
	"io"
	"io/fs"
	"os"
	"path/filepath"
	"strings"

	"github.com/klauspost/compress/flate"
	"github.com/klauspost/compress/zip"

	unarr "github.com/gen2brain/go-unarr"
	"github.com/nwaples/rardecode"
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
		_, err := extract(path, t, false, func(progress int64, total int64) {})
		if err != nil {
			return nil
		}

		newZip := strings.TrimSuffix(path, ".zip") + "_new.zip"
		fmt.Println("extraxting to " + newZip + "from " + path)
		err = ZipFolder(t, newZip)
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
func ZipFolder(srcDir, destZip string) error {

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
		return err
	})
}

func archiveUncompressedSize(a *unarr.Archive) (int64, []string, error) {
	total := int64(0)
	contents := []string{}
	for {
		e := a.Entry()
		if e != nil {
			if e == io.EOF {
				break
			}
			return 0, contents, e
		}
		contents = append(contents, a.Name())
		total += int64(a.Size())
	}
	return total, contents, nil
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

func extract(archivePath, path string, unifyRoot bool, onProgress func(progress int64, total int64)) (contents []string, err error) {

	if onProgress == nil {
		onProgress = func(progress, total int64) {}
	}

	log.LogDebug("Archive path: " + archivePath)
	sizeA, err := unarr.NewArchive(archivePath)
	if err != nil {
		log.LogDebug("error creating size archive")
		return
	}
	total, contents, err := archiveUncompressedSize(sizeA)
	if err != nil {
		log.LogDebug("error reading archive size")
	}
	log.LogDebug(fmt.Sprintf("archive size %d", total))
	progress := int64(0)
	sizeA.Close()

	a, err := unarr.NewArchive(archivePath)
	if err != nil {
		return contents, err
	}
	defer a.Close()

	onProgress(progress, total)

	basePath := path
	if !hasUniformRoot(contents) && unifyRoot {
		basePath = filepath.Join(path, filepath.Base(path))
	}

	for {
		e := a.Entry()
		if e != nil {
			if e == io.EOF {
				break
			}

			err = e
			return
		}

		name := a.Name()
		contents = append(contents, name)
		data, e := a.ReadAll()
		if e != nil {
			err = e
			return
		}

		dirname := filepath.Join(basePath, filepath.Dir(name))
		_ = os.MkdirAll(dirname, 0755)

		e = os.WriteFile(filepath.Join(dirname, filepath.Base(name)), data, 0644)
		if e != nil {
			err = e
			return
		}
		progress += int64(a.Size())
		onProgress(progress, total)
	}

	return
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

func extractRAR(xFile *XFile, unifyRoot bool, onProgress func(progress int64, total int64)) (int64, []string, []string, error) {
	rarReader, err := rardecode.OpenReader(xFile.FilePath, xFile.Password)
	if err != nil {
		return 0, nil, nil, fmt.Errorf("rardecode.OpenReader: %w", err)
	}
	defer rarReader.Close()

	if onProgress == nil {
		onProgress = func(progress, total int64) {}
	}

	size, files, err := unrar(xFile, rarReader, unifyRoot, onProgress)
	if err != nil {
		lastFile := xFile.FilePath
		if volumes := rarReader.Volumes(); len(volumes) > 0 {
			lastFile = volumes[len(volumes)-1]
		}

		return size, files, rarReader.Volumes(), fmt.Errorf("%s: %w", lastFile, err)
	}

	return size, files, rarReader.Volumes(), nil
}

// clean returns an absolute path for a file inside the OutputDir.
// If trim length is > 0, then the suffixes are trimmed, and filepath removed.
func clean(x *XFile, filePath string, trim ...string) string {
	if len(trim) != 0 {
		filePath = filepath.Base(filePath)
		for _, suffix := range trim {
			filePath = strings.TrimSuffix(filePath, suffix)
		}
	}

	return filepath.Clean(filepath.Join(x.OutputDir, filePath))
}

func rarUncompressedSize(rarReader *rardecode.ReadCloser) (int64, []string, error) {
	var totalSize int64 = 0
	contents := []string{}
	// Iterate through each file in the archive
	for {
		header, err := rarReader.Next()
		if err != nil {
			if err == io.EOF {
				// End of archive
				break
			}
			return 0, contents, fmt.Errorf("error reading archive: %w", err)
		}
		contents = append(contents, header.Name)
		// Accumulate the uncompressed size
		totalSize += header.UnPackedSize
	}
	return totalSize, contents, nil
}

// XFile defines the data needed to extract an archive.
type XFile struct {
	// Path to archive being extracted.
	FilePath string
	// Folder to extract archive into.
	OutputDir string
	// Write files with this mode.
	FileMode os.FileMode
	// Write folders with this mode.
	DirMode os.FileMode
	// (RAR/7z) Archive password. Blank for none. Gets prepended to Passwords, below.
	Password string
	// (RAR/7z) Archive passwords (to try multiple).
	Passwords []string
}

func unrar(x *XFile, rarReader *rardecode.ReadCloser, unifyRoot bool, onProgress func(progress int64, total int64)) (int64, []string, error) {
	files := []string{}
	size := int64(0)

	var total int64
	var contents []string

	if sizeReader, err := rardecode.OpenReader(x.FilePath, ""); err != nil {
		return size, files, fmt.Errorf("error reading total size %w", err)
	} else {
		total, contents, err = rarUncompressedSize(sizeReader)
		sizeReader.Close()
		if err != nil {
			return total, contents, err
		}
	}
	onProgress(0, total)

	if !hasUniformRoot(contents) && unifyRoot {
		x.OutputDir = filepath.Join(x.OutputDir, filepath.Base(x.OutputDir))
	}

	for {
		header, err := rarReader.Next()

		switch {
		case errors.Is(err, io.EOF):
			return size, files, nil
		case err != nil:
			return size, files, fmt.Errorf("rarReader.Next: %w", err)
		case header == nil:
			return size, files, fmt.Errorf("%w: %s", ErrInvalidHead, x.FilePath)
		}

		wfile := clean(x, header.Name)
		//nolint:gocritic // this 1-argument filepath.Join removes a ./ prefix should there be one.
		if !strings.HasPrefix(wfile, filepath.Join(x.OutputDir)) {
			// The file being written is trying to write outside of our base path. Malicious archive?
			return size, files, fmt.Errorf("%s: %w: %s != %s (from: %s)",
				x.FilePath, ErrInvalidPath, wfile, x.OutputDir, header.Name)
		}

		if header.IsDir {
			if err = os.MkdirAll(wfile, x.DirMode); err != nil {
				return size, files, fmt.Errorf("os.MkdirAll: %w", err)
			}

			continue
		}

		if err = os.MkdirAll(filepath.Dir(wfile), x.DirMode); err != nil {
			return size, files, fmt.Errorf("os.MkdirAll: %w", err)
		}

		fSize, err := writeFile(wfile, rarReader, x.FileMode, x.DirMode)
		if err != nil {
			return size, files, err
		}

		files = append(files, wfile)
		size += fSize
		onProgress(size, total)
	}
}

// writeFile writes a file from an io reader, making sure all parent directories exist.
func writeFile(fpath string, fdata io.Reader, fMode, dMode os.FileMode) (int64, error) {
	if err := os.MkdirAll(filepath.Dir(fpath), dMode); err != nil {
		return 0, fmt.Errorf("os.MkdirAll: %w", err)
	}

	fout, err := os.OpenFile(fpath, os.O_RDWR|os.O_CREATE|os.O_TRUNC, fMode)
	if err != nil {
		return 0, fmt.Errorf("os.OpenFile: %w", err)
	}
	defer fout.Close()

	s, err := io.Copy(fout, fdata)
	if err != nil {
		return s, fmt.Errorf("copying io: %w", err)
	}

	return s, nil
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
