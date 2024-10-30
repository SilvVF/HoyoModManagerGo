package types

const (
	Genshin  = 1
	StarRail = 2
	ZZZ      = 3
	WuWa     = 4
)

type Game int

var Games = []Game{Genshin, StarRail, ZZZ, WuWa}

func (g Game) Int64() int64 {
	switch g {
	case Genshin:
		return 1
	case StarRail:
		return 2
	case ZZZ:
		return 3
	case WuWa:
		return 4
	}
	return -1
}

func (g Game) Name() string {
	switch g {
	case Genshin:
		return "Genshin"
	case StarRail:
		return "StarRail"
	case ZZZ:
		return "ZZZ"
	case WuWa:
		return "WuWa"
	}
	return ""
}

type FileInfo struct {
	File  string `json:"file"`
	Bytes int64  `json:"bytes"`
}

type DownloadStats struct {
	Data       [][]FileInfo `json:"data"`
	TotalBytes int64        `json:"totalBytes"`
}

type Character struct {
	Id        int    `json:"id"`
	Game      Game   `json:"game"`
	Name      string `json:"name"`
	AvatarUrl string `json:"avatarUrl"`
	Element   string `json:"element"`
}

type CharacterWithModsAndTags struct {
	Character   Character     `json:"characters"`
	ModWithTags []ModWithTags `json:"modWithTags"`
}

type ModWithTags struct {
	Mod      Mod       `json:"mod"`
	Tags     []Tag     `json:"tags"`
	Textures []Texture `json:"textures"`
}

type Mod struct {
	Filename       string   `json:"filename"`
	Game           Game     `json:"game"`
	Character      string   `json:"character"`
	CharacterId    int      `json:"characterId"`
	Enabled        bool     `json:"enabled"`
	PreviewImages  []string `json:"previewImages"`
	GbId           int      `json:"gbId"`
	ModLink        string   `json:"modLink"`
	GbFileName     string   `json:"gbFileName"`
	GbDownloadLink string   `json:"gbDownloadLink"`
	Id             int      `json:"id"`
}

type Texture struct {
	Filename       string   `json:"filename"`
	Enabled        bool     `json:"enabled"`
	PreviewImages  []string `json:"previewImages"`
	GbId           int      `json:"gbId"`
	ModLink        string   `json:"modLink"`
	GbFileName     string   `json:"gbFileName"`
	GbDownloadLink string   `json:"gbDownloadLink"`
	ModId          int      `json:"modId"`
	Id             int      `json:"id"`
}

type Tag struct {
	ModId int    `json:"modId"`
	Name  string `json:"name"`
}

type Playlist struct {
	Id   int    `json:"id"`
	Name string `json:"name"`
	Game Game   `json:"game"`
}

type PlaylistModCrossRef struct {
	PlaylistId int `json:"playlistId"`
	ModId      int `json:"modId"`
}

type PlaylistWithModsAndTags struct {
	Playlist     Playlist      `json:"playlist"`
	ModsWithTags []ModWithTags `json:"modsWithTags"`
}
