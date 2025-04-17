package api

import (
	"bufio"
	"fmt"
	"hmm/pkg/log"
	"hmm/pkg/types"
	"hmm/pkg/util"
	"slices"
	"strings"

	"golang.org/x/net/html"
)

const (
	ZENLESS_SKIN_ID = 30305
	PRYDWEN_URL     = "https://www.prydwen.gg"
)

type zenlessZoneZeroApi struct {
	Game    types.Game `json:"game"`
	SkinIdV int        `json:"skinIdV"`
}

func NewZenlessZoneZeroApi() *zenlessZoneZeroApi {
	return &zenlessZoneZeroApi{
		types.ZZZ,
		ZENLESS_SKIN_ID,
	}
}

func (z *zenlessZoneZeroApi) GetGame() types.Game {
	return z.Game
}

func (z *zenlessZoneZeroApi) SkinId() int {
	return z.SkinIdV
}

func (z *zenlessZoneZeroApi) Elements() []string {
	return []string{"Electric", "Ether", "Fire", "Ice", "Physical"}
}

func (z *zenlessZoneZeroApi) Characters() []types.Character {
	r, err := client.Get(fmt.Sprintf("%s/zenless/characters/", PRYDWEN_URL))
	if err != nil {
		return make([]types.Character, 0)
	}
	defer r.Body.Close()
	doc, err := html.Parse(bufio.NewReader(r.Body))
	if err != nil {
		return make([]types.Character, 0)
	}

	elements := findMatchingElemsWithClass(doc, "div", "avatar-card")
	characters := make([]types.Character, 0, len(elements))

	for _, element := range elements {
		nameElements := findMatchingElemsWithClass(element, "span", "emp-name")

		if len(nameElements) <= 0 {
			continue
		}
		nameElement := nameElements[0]

		name := strings.TrimSpace(getTextContent(nameElement))
		imgElements := findMatchingElemsWithClass(element, "div", "gatsby-image-wrapper")
		if len(imgElements) <= 0 {
			continue
		}
		imgElements = findMatchingElems(imgElements[0], "img")
		elementDiv := findMatchingElemsWithClass(element, "span", "floating-element")
		if len(elementDiv) <= 0 {
			continue
		}
		elementDiv = findMatchingElemsWithClass(elementDiv[0], "div", "element")
		if len(elementDiv) <= 0 {
			continue
		}
		typeElement := findMatchingElems(elementDiv[0], "img")
		if len(typeElement) <= 0 {
			continue
		}

		typeDoc := typeElement[len(typeElement)-1]
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

		findAlt(typeDoc)
		log.LogDebug(altText + " " + name)

		dataSrc := attrsForNode(imgElements[len(imgElements)-1])["data-src"]
		avatar := dataSrc[0]

		character := types.Character{
			Id:        util.HashForName(name),
			Game:      z.Game,
			Name:      name,
			AvatarUrl: PRYDWEN_URL + avatar,
			Element:   altText,
		}
		characters = append(characters, character)
	}
	return characters
}
