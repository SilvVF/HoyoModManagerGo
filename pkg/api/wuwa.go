package api

import (
	"fmt"
	"hash/fnv"
	"hmm/pkg/log"
	"hmm/pkg/types"

	"github.com/anaskhan96/soup"
)

const (
	WUWA_SKIN_ID = 29524
)

type WutheringWavesApi struct {
	Game    types.Game `json:"game"`
	SkinIdV int        `json:"skinIdV"`
}

func NewWutherWavesApi() *WutheringWavesApi {
	return &WutheringWavesApi{
		types.WuWa,
		WUWA_SKIN_ID,
	}
}

func (w *WutheringWavesApi) SkinId() int {
	return w.SkinIdV
}

func (w *WutheringWavesApi) GetGame() types.Game {
	return w.Game
}

func (w *WutheringWavesApi) Elements() []string {
	return []string{"Aero", "Electro", "Fusion", "Glacio", "Havoc", "Spectro"}
}

func (w *WutheringWavesApi) Characters() []types.Character {
	res, err := soup.Get(fmt.Sprintf("%s/wuthering-waves/characters/", PRYDWEN_URL))
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
		log.LogDebug(imgElement[len(imgElement)-1].HTML())
		log.LogDebug(imgElement[len(imgElement)-1].Attrs()["data-src"])
		elementDiv := element.Find("span", "class", "floating-element").Find("div", "class", "element")
		typeElement := elementDiv.Find("img")

		h := fnv.New32a()
		h.Write([]byte(name))

		character := types.Character{
			Id:        int(h.Sum32()),
			Game:      w.Game,
			Name:      name,
			AvatarUrl: PRYDWEN_URL + imgElement[len(imgElement)-1].Attrs()["data-src"],
			Element:   typeElement.Attrs()["alt"],
		}
		characters = append(characters, character)
	}
	return characters
}
