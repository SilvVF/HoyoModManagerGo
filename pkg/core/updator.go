package core

import (
	"encoding/json"
	"errors"
	"fmt"
	"hmm/pkg/api"
	"hmm/pkg/log"
	"hmm/pkg/pref"
	"hmm/pkg/types"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"slices"
	"strconv"
	"strings"
	"sync"
	"time"
)

type Updator struct {
	api        *api.GbApi
	exportDirs map[types.Game]pref.Preference[string]
}

func NewUpdator(api *api.GbApi, dirs map[types.Game]pref.Preference[string]) *Updator {
	return &Updator{
		api:        api,
		exportDirs: dirs,
	}
}

func (u *Updator) CheckAppForUpdates() (types.AppUpdate, error) {
	url := "https://api.github.com/repos/SilvVF/HoyoModManagerGo/releases/latest"
	resp, err := http.Get(url)
	if err != nil {
		return types.AppUpdate{}, err
	}
	defer resp.Body.Close()

	var githubResp GithubLatestReleaseResponse
	b, err := io.ReadAll(resp.Body)
	if err != nil {
		return types.AppUpdate{}, err
	}
	err = json.Unmarshal(b, &githubResp)
	if err != nil {
		return types.AppUpdate{}, err
	}
	return types.AppUpdate{
		Version:      githubResp.Name,
		PublishedAt:  githubResp.PublishedAt,
		CreatedAt:    githubResp.CreatedAt,
		DLLink:       githubResp.HTMLURL,
		ReleaseNotes: githubResp.Body,
	}, nil
}

func (u *Updator) CheckFixesForUpdate() []types.Update {
	ret := make([]types.Update, len(types.Games))

	wg := sync.WaitGroup{}

	for i, game := range types.Games {
		wg.Add(1)

		var local string
		var network types.Tool
		var nOk bool

		go func() {
			defer wg.Done()

			checkWg := sync.WaitGroup{}
			checkWg.Add(2)

			go func() {
				defer checkWg.Done()
				exePath, _ := u.checkLocalForCurrent(game)
				local = exePath
			}()

			go func() {
				defer checkWg.Done()
				network, nOk = u.checkNetworkForUpdate(game)
			}()

			checkWg.Wait()

			ret[i] = types.Update{
				Game:    game,
				Current: local,
				Newest:  network,
				Found:   nOk,
			}
		}()
	}

	wg.Wait()

	return ret
}

func (u *Updator) DownloadModFix(game types.Game, old, fname, link string) error {

	outputDir, ok := u.exportDirs[game]
	if !ok {
		return errors.New("output dir not set")
	}

	res, err := http.Get(link)
	if err != nil {
		return err
	}
	defer res.Body.Close()

	ext := filepath.Ext(fname)
	if ext != ".exe" && !slices.Contains([]string{".zip", ".rar", ".7z"}, ext) {
		return errors.New("file is not an executable or extractable")
	}

	path := filepath.Join(outputDir.Get(), fname)
	// the file is truncated by default
	file, err := os.Create(path)
	if err != nil {
		return err
	}
	if _, err = io.Copy(file, res.Body); err != nil {
		return err
	}
	file.Close()

	switch filepath.Ext(file.Name()) {
	case ".exe":
		os.Remove(old)
		return err
	default:
		defer os.RemoveAll(path)
		_, err := archiveExtract(path, filepath.Dir(path), false, func(progress, total int64) {})

		if err == nil {
			os.Remove(old)
		}

		return err
	}
}

func (u *Updator) checkLocalForCurrent(game types.Game) (string, bool) {
	dir, ok := u.exportDirs[types.Game(game)]
	if !ok || !dir.IsSet() {
		return "", false
	}
	path := dir.Get()
	file, err := os.Open(path)
	if err != nil {
		log.LogDebug(err.Error())
		return "", false
	}
	subdirs, err := file.Readdirnames(-1)
	if err != nil {
		log.LogDebug(err.Error())
		return "", false
	}
	return getModFixExe(subdirs), true
}

func (u *Updator) gameToToolId(game types.Game) int {
	switch game {
	case types.Genshin:
		return 16433
	case types.StarRail:
		return 18925
	case types.ZZZ:
		return 18989
	case types.WuWa:
		records, err := u.api.SubmitterItems(2890460)
		if err != nil {
			log.LogDebug(err.Error())
			return -1
		}
		newest := 0.0
		nid := -1

		for _, record := range records.ARecords {
			if record.SModelName == "Tool" {
				id := record.IDRow
				name := record.SName

				if strings.Contains(name, "Fix") {
					v, err := filterDigits(name)
					if err == nil && v > newest {
						nid = id
						newest = v
					}
				}
			}
		}
		return nid
	}
	return -1
}

func filterDigits(s string) (float64, error) {
	re := regexp.MustCompile(`[-+]?\d*\.?\d+`)
	match := re.FindString(s)
	if match == "" {
		return 0, fmt.Errorf("no number found in string")
	}

	num, err := strconv.ParseFloat(match, 64)
	if err != nil {
		return 0, err
	}
	return num, nil
}

func (u *Updator) checkNetworkForUpdate(game types.Game) (types.Tool, bool) {
	id := u.gameToToolId(game)
	if id == -1 {
		return types.Tool{}, false
	}
	page, err := u.api.ToolPage(id)
	if err != nil {
		log.LogDebug(err.Error())
		return types.Tool{}, false
	}
	for _, file := range page.AFiles {
		if file.BContainsExe {
			tool := types.Tool{
				Dl:          file.SDownloadURL,
				Name:        page.SName,
				Description: file.SDescription,
				FName:       file.SFile,
			}
			return tool, true
		}
	}
	return types.Tool{}, false
}

type GithubLatestReleaseResponse struct {
	URL       string `json:"url"`
	AssetsURL string `json:"assets_url"`
	UploadURL string `json:"upload_url"`
	HTMLURL   string `json:"html_url"`
	ID        int    `json:"id"`
	Author    struct {
		Login             string `json:"login"`
		ID                int    `json:"id"`
		NodeID            string `json:"node_id"`
		AvatarURL         string `json:"avatar_url"`
		GravatarID        string `json:"gravatar_id"`
		URL               string `json:"url"`
		HTMLURL           string `json:"html_url"`
		FollowersURL      string `json:"followers_url"`
		FollowingURL      string `json:"following_url"`
		GistsURL          string `json:"gists_url"`
		StarredURL        string `json:"starred_url"`
		SubscriptionsURL  string `json:"subscriptions_url"`
		OrganizationsURL  string `json:"organizations_url"`
		ReposURL          string `json:"repos_url"`
		EventsURL         string `json:"events_url"`
		ReceivedEventsURL string `json:"received_events_url"`
		Type              string `json:"type"`
		UserViewType      string `json:"user_view_type"`
		SiteAdmin         bool   `json:"site_admin"`
	} `json:"author"`
	NodeID          string    `json:"node_id"`
	TagName         string    `json:"tag_name"`
	TargetCommitish string    `json:"target_commitish"`
	Name            string    `json:"name"`
	Draft           bool      `json:"draft"`
	Prerelease      bool      `json:"prerelease"`
	CreatedAt       time.Time `json:"created_at"`
	PublishedAt     time.Time `json:"published_at"`
	Assets          []struct {
		URL      string `json:"url"`
		ID       int    `json:"id"`
		NodeID   string `json:"node_id"`
		Name     string `json:"name"`
		Label    any    `json:"label"`
		Uploader struct {
			Login             string `json:"login"`
			ID                int    `json:"id"`
			NodeID            string `json:"node_id"`
			AvatarURL         string `json:"avatar_url"`
			GravatarID        string `json:"gravatar_id"`
			URL               string `json:"url"`
			HTMLURL           string `json:"html_url"`
			FollowersURL      string `json:"followers_url"`
			FollowingURL      string `json:"following_url"`
			GistsURL          string `json:"gists_url"`
			StarredURL        string `json:"starred_url"`
			SubscriptionsURL  string `json:"subscriptions_url"`
			OrganizationsURL  string `json:"organizations_url"`
			ReposURL          string `json:"repos_url"`
			EventsURL         string `json:"events_url"`
			ReceivedEventsURL string `json:"received_events_url"`
			Type              string `json:"type"`
			UserViewType      string `json:"user_view_type"`
			SiteAdmin         bool   `json:"site_admin"`
		} `json:"uploader"`
		ContentType        string    `json:"content_type"`
		State              string    `json:"state"`
		Size               int       `json:"size"`
		DownloadCount      int       `json:"download_count"`
		CreatedAt          time.Time `json:"created_at"`
		UpdatedAt          time.Time `json:"updated_at"`
		BrowserDownloadURL string    `json:"browser_download_url"`
	} `json:"assets"`
	TarballURL string `json:"tarball_url"`
	ZipballURL string `json:"zipball_url"`
	Body       string `json:"body"`
}
