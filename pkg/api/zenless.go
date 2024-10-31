package api

import (
	"fmt"
	"hash/fnv"
	"hmm/pkg/log"
	"hmm/pkg/types"
	"slices"
	"strings"

	"github.com/anaskhan96/soup"
	"golang.org/x/net/html"
)

const (
	ZENLESS_SKIN_ID = 30305
	PRYDWEN_URL     = "https://www.prydwen.gg"
)

type ZenlessZoneZeroApi struct {
	Game    types.Game `json:"game"`
	SkinIdV int        `json:"skinIdV"`
}

func NewZenlessZoneZeroApi() *ZenlessZoneZeroApi {
	return &ZenlessZoneZeroApi{
		types.ZZZ,
		ZENLESS_SKIN_ID,
	}
}

func (z *ZenlessZoneZeroApi) GetGame() types.Game {
	return z.Game
}

func (z *ZenlessZoneZeroApi) SkinId() int {
	return z.SkinIdV
}

func (z *ZenlessZoneZeroApi) Elements() []string {
	return []string{"Electric", "Ether", "Fire", "Ice", "Physical"}
}

func (z *ZenlessZoneZeroApi) Characters() []types.Character {
	res, err := soup.GetWithClient(fmt.Sprintf("%s/zenless/characters/", PRYDWEN_URL), &client)
	if err != nil {
		return make([]types.Character, 0)
	}
	doc := soup.HTMLParse(res)

	elements := doc.FindAll("div", "class", "avatar-card")
	characters := make([]types.Character, len(elements))

	for _, element := range elements {
		nameElement := element.Find("span", "class", "emp-name")
		name := nameElement.Text()
		imgElement := element.Find("div", "class", "gatsby-image-wrapper").FindAll("img")
		elementDiv := element.Find("span", "class", "floating-element").Find("div", "class", "element")
		typeElement := elementDiv.FindAll("img")

		h := fnv.New32a()
		h.Write([]byte(name))

		doc, err := html.Parse(strings.NewReader(typeElement[len(typeElement)-1].HTML()))
		if err != nil {
			return characters
		}

		// Traverse the HTML nodes and find the img tag
		var altText string
		var findAlt func(*html.Node)
		findAlt = func(n *html.Node) {
			if n.Type == html.ElementNode && n.Data == "img" {
				for _, attr := range n.Attr {
					if attr.Key == "alt" && slices.Contains(z.Elements(), attr.Val) {
						altText = attr.Val
						return
					}
				}
			}
			for c := n.FirstChild; c != nil; c = c.NextSibling {
				findAlt(c)
			}
		}

		findAlt(doc)
		log.LogDebug(altText + " " + name)

		character := types.Character{
			Id:        int(h.Sum32()),
			Game:      z.Game,
			Name:      name,
			AvatarUrl: PRYDWEN_URL + imgElement[len(imgElement)-1].Attrs()["data-src"],
			Element:   altText,
		}
		characters = append(characters, character)
	}
	return characters
}
