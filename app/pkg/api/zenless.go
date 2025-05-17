package api

import (
	"bufio"
	"fmt"
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
		return []types.Character{}
	}
	defer r.Body.Close()

	doc, err := html.Parse(bufio.NewReader(r.Body))
	if err != nil {
		return []types.Character{}
	}

	elements := findMatchingElemsWithClass(doc, "div", "avatar-card")
	characters := make([]types.Character, 0, len(elements))

	for _, element := range elements {
		nameEls := findMatchingElemsWithClass(element, "span", "emp-name")
		if len(nameEls) == 0 {
			continue
		}
		name := strings.TrimSpace(getTextContent(nameEls[0]))

		imgWrapper := findMatchingElemsWithClass(element, "div", "gatsby-image-wrapper")
		if len(imgWrapper) == 0 {
			continue
		}
		imgEls := findMatchingElems(imgWrapper[0], "img")
		if len(imgEls) == 0 {
			continue
		}

		elemSpans := findMatchingElemsWithClass(element, "span", "floating-element")
		if len(elemSpans) == 0 {
			continue
		}
		elemDivs := findMatchingElemsWithClass(elemSpans[0], "div", "element")
		if len(elemDivs) == 0 {
			continue
		}
		typeImgs := findMatchingElems(elemDivs[0], "img")
		if len(typeImgs) == 0 {
			continue
		}

		typeDoc := typeImgs[len(typeImgs)-1]

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

		dataSrc := attrsForNode(imgEls[len(imgEls)-1])["data-src"]
		if len(dataSrc) == 0 {
			continue
		}

		characters = append(characters, types.Character{
			Id:        util.HashForName(name),
			Game:      z.Game,
			Name:      name,
			AvatarUrl: strings.TrimSpace(PRYDWEN_URL + dataSrc[0]),
			Element:   altText,
		})
	}

	return characters
}
