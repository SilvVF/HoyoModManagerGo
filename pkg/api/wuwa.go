package api

import (
	"bufio"
	"fmt"
	"hash/fnv"
	"hmm/pkg/log"
	"hmm/pkg/types"
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
		nameElement := findMatchingElemsWithClass(element, "span", "emp-name")

		if len(nameElement) <= 0 {
			continue
		}

		name := strings.TrimSpace(getTextContent(nameElement[0]))

		imgElements := findMatchingElemsWithClass(element, "div", "gatsby-image-wrapper")
		log.LogDebugf("%v", imgElements)
		imgElements = findMatchingElems(imgElements[0], "img")
		log.LogDebugf("%v", imgElements)

		ieAttrs := attrsForNode(imgElements[len(imgElements)-1])
		log.LogDebugf("%v", ieAttrs)
		avatar := ieAttrs["data-src"]
		typeElement := findMatchingElems(element, "img")
		teAttrs := attrsForNode(typeElement[len(typeElement)-1])
		elem := teAttrs["alt"]

		h := fnv.New32a()
		h.Write([]byte(name))

		character := types.Character{
			Id:        int(h.Sum32()),
			Game:      w.Game,
			Name:      name,
			AvatarUrl: PRYDWEN_URL + avatar[0],
			Element:   elem[0],
		}
		characters = append(characters, character)
	}
	return characters
}
