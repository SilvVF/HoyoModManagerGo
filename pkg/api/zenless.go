package api

import (
	"fmt"
	"hash/fnv"
	"hmm/pkg/log"
	"hmm/pkg/types"

	"github.com/anaskhan96/soup"
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
		log.LogDebug(imgElement[len(imgElement)-1].HTML())
		log.LogDebug(imgElement[len(imgElement)-1].Attrs()["data-src"])
		elementDiv := element.Find("span", "class", "floating-element").Find("div", "class", "element")
		typeElement := elementDiv.Find("img")

		h := fnv.New32a()
		h.Write([]byte(name))

		character := types.Character{
			Id:        int(h.Sum32()),
			Game:      z.Game,
			Name:      name,
			AvatarUrl: PRYDWEN_URL + imgElement[len(imgElement)-1].Attrs()["data-src"],
			Element:   typeElement.Attrs()["alt"],
		}
		characters = append(characters, character)
	}
	return characters
}
