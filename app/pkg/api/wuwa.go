package api

import (
	"bufio"
	"fmt"
	"hmm/pkg/log"
	"hmm/pkg/types"
	"hmm/pkg/util"
	"strings"

	"golang.org/x/net/html"
)

const (
	WUWA_SKIN_ID = 29524
)

type wutheringWavesApi struct {
	Game    types.Game `json:"game"`
	SkinIdV int        `json:"skinIdV"`
}

func NewWutherWavesApi() *wutheringWavesApi {
	return &wutheringWavesApi{
		types.WuWa,
		WUWA_SKIN_ID,
	}
}

func (w *wutheringWavesApi) SkinId() int {
	return w.SkinIdV
}

func (w *wutheringWavesApi) GetGame() types.Game {
	return w.Game
}

func (w *wutheringWavesApi) Elements() []string {
	return []string{"Aero", "Electro", "Fusion", "Glacio", "Havoc", "Spectro"}
}

func (w *wutheringWavesApi) Characters() []types.Character {
	r, err := client.Get(fmt.Sprintf("%s/wuthering-waves/characters/", PRYDWEN_URL))
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

		lastImg := imgEls[len(imgEls)-1]
		ieAttrs := attrsForNode(lastImg)
		log.LogDebugf("%v", ieAttrs)

		avatar := ieAttrs["data-src"]
		if len(avatar) == 0 {
			continue
		}

		typeEls := findMatchingElems(element, "img")
		if len(typeEls) == 0 {
			continue
		}
		lastTypeImg := typeEls[len(typeEls)-1]
		teAttrs := attrsForNode(lastTypeImg)

		elem := teAttrs["alt"]
		if len(elem) == 0 {
			continue
		}

		characters = append(characters, types.Character{
			Id:        util.HashForName(name),
			Game:      w.Game,
			Name:      name,
			AvatarUrl: strings.TrimSpace(PRYDWEN_URL + avatar[0]),
			Element:   elem[0],
		})
	}

	return characters
}
