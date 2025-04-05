package api

import (
	"bufio"
	"errors"
	"fmt"
	"hash/fnv"
	"hmm/pkg/log"
	"hmm/pkg/types"
	"strings"

	"golang.org/x/net/html"
)

// type DataApi interface {
// 	SkinId() int
// 	GetGame() types.Game
// 	Elements() []string
// 	Characters() []types.Character
// }

type leagueApi struct{}

func NewLeagueApi() DataApi {
	return &leagueApi{}
}

func (l *leagueApi) SkinId() int {
	return -1
}

func (l *leagueApi) GetGame() types.Game {
	return types.LoL
}

var roles = []string{
	"Controller",
	"Enchanter",
	"Catcher",
	"Fighter",
	"Juggernaut",
	"Diver",
	"Mage",
	"Burst",
	"Battlemage",
	"Artillery",
	"Marksman",
	"Slayer",
	"Assassin",
	"Skirmisher",
	"Tank",
	"Vanguard",
	"Warden",
	"Specialist",
}

func (l *leagueApi) Elements() []string {
	return roles
}

func (l *leagueApi) Characters() []types.Character {

	r, err := client.Get("https://wiki.leagueoflegends.com/en-us/List_of_champions")
	if err != nil {
		log.LogError("failed to get response league api")
		return make([]types.Character, 0)
	}
	defer r.Body.Close()

	doc, err := html.Parse(bufio.NewReader(r.Body))

	if err != nil {
		log.LogError("failed to read body for league api")
		return make([]types.Character, 0)
	}
	tables := findMatchingElemsWithClass(doc, "table", "article-table")

	log.LogDebugf("%v %d", tables, len(tables))

	champs, err := extractChampions(tables[0])
	if err != nil {
		log.LogError("failed to read body for league api")
		return make([]types.Character, 0)
	}

	log.LogDebugf("%v %d", champs, len(champs))

	chars := make([]types.Character, len(champs))

	for i, c := range champs {

		h := fnv.New32a()
		h.Write([]byte(c.Name))

		classes := strings.Split(c.Class, " ")

		chars[i] = types.Character{
			Id:        int(h.Sum32()),
			Game:      types.LoL,
			Name:      c.Name,
			AvatarUrl: fmt.Sprintf("https://ddragon.leagueoflegends.com/cdn/img/champion/splash/%s_0.jpg", cleanName(c.Name)),
			Element:   strings.TrimSpace(classes[0]),
		}
	}

	return chars
}

func cleanName(n string) string {
	nq := strings.ReplaceAll(n, "'", "")
	return strings.Split(nq, " ")[0]
}

type Champion struct {
	Name     string
	ImageURL string
	Class    string
}

// extractChampions parses a table node and extracts Champion data.
func extractChampions(table *html.Node) ([]Champion, error) {
	var tbody *html.Node
	for c := table.FirstChild; c != nil; c = c.NextSibling {
		if c.Type == html.ElementNode && c.Data == "tbody" {
			tbody = c
			break
		}
	}

	if tbody == nil {
		return make([]Champion, 0), errors.New("no tbody")
	}

	champions := []Champion{}

	for row := tbody.FirstChild; row != nil; row = row.NextSibling {
		if row.Type != html.ElementNode || row.Data != "tr" {
			continue
		}

		var tds []*html.Node
		for cell := row.FirstChild; cell != nil; cell = cell.NextSibling {
			if cell.Type == html.ElementNode && cell.Data == "td" {
				tds = append(tds, cell)
			}
		}
		if len(tds) < 2 {
			continue
		}

		name := extractChampionName(tds[0])
		imageURL := extractChampionImage(tds[0])
		class := extractChapmpionClasses(tds[1])

		champions = append(champions, Champion{
			Name:     name,
			ImageURL: imageURL,
			Class:    class,
		})
	}

	return champions, nil
}

func extractChapmpionClasses(n *html.Node) string {
	var sb strings.Builder
	var f func(*html.Node)
	f = func(n *html.Node) {
		if n.Type == html.TextNode {
			sb.WriteString(n.Data)
		}
		for c := n.FirstChild; c != nil; c = c.NextSibling {
			f(c)
		}
	}
	f(n)
	return strings.TrimSpace(sb.String())
}

func extractChampionName(td *html.Node) string {
	var name string
	var f func(*html.Node)
	f = func(n *html.Node) {
		if name != "" {
			return
		}
		if n.Type == html.ElementNode && n.Data == "a" {
			name = extractTextContent(n)
			return
		}
		for c := n.FirstChild; c != nil; c = c.NextSibling {
			f(c)
		}
	}
	f(td)
	return name
}

func extractChampionImage(td *html.Node) string {
	var src string
	var f func(*html.Node)
	f = func(n *html.Node) {
		if src != "" {
			return
		}
		if n.Type == html.ElementNode && n.Data == "img" {
			for _, attr := range n.Attr {
				if attr.Key == "src" {
					src = attr.Val
					return
				}
			}
		}
		for c := n.FirstChild; c != nil; c = c.NextSibling {
			f(c)
		}
	}
	f(td)
	return src
}

func extractTextContent(n *html.Node) string {
	var result strings.Builder

	// Traverse the children of the node
	for c := n.FirstChild; c != nil; c = c.NextSibling {
		if c.Type == html.ElementNode && c.Data == "br" {
			// Stop at <br> tag and return the content before it
			break
		}
		// Append text content of the node
		if c.Type == html.TextNode {
			result.WriteString(c.Data)
		}
	}

	return strings.TrimSpace(result.String())
}
