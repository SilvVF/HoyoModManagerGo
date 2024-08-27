package api

import (
	"encoding/json"
	"fmt"
	"hmm/pkg/types"
	"io"
	"net/http"
)

const (
	iconFmtString = "https://raw.githubusercontent.com/Mar-7th/StarRailRes/master/%s"
)

type StarRailApi struct{}

func (s *StarRailApi) SkinId() int {
	return 22832
}

func (s *StarRailApi) GetGame() types.Game {
	return types.StarRail
}

func (s *StarRailApi) Elements() []string {
	return []string{"Ice", "Physical", "Fire", "Lightning", "Wind", "Quantum", "Imaginary"}
}

type Characters map[string]struct {
	Id         int      `json:"id,string"`
	Name       string   `json:"name"`
	Tag        string   `json:"tag"`
	Rarity     int      `json:"rarity"`
	Path       string   `json:"path"`
	Element    string   `json:"element"`
	MaxSP      int      `json:"max_sp"`
	Ranks      []string `json:"ranks"`
	Skills     []string `json:"skills"`
	SkillTrees []string `json:"skill_trees"`
	Icon       string   `json:"icon"`
	Preview    string   `json:"preview"`
	Portrait   string   `json:"portrait"`
}

func (s *StarRailApi) Characters() []types.Character {
	resp, err := http.Get("https://raw.githubusercontent.com/Mar-7th/StarRailRes/master/index_new/en/characters.json")

	if err != nil {
		return make([]types.Character, 0)
	}

	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)

	if err != nil {
		return make([]types.Character, 0)
	}

	var jsonCharacter Characters

	err = json.Unmarshal(body, &jsonCharacter)

	if err != nil {
		return make([]types.Character, 0)
	}

	characters := make([]types.Character, 0, len(jsonCharacter))

	for _, c := range jsonCharacter {
		if c.Name == "{NICKNAME}" {
			continue
		}
		if c.Element == "Thunder" {
			c.Element = "Lightning"
		}
		characters = append(characters, types.Character{
			Id:        c.Id,
			Element:   c.Element,
			AvatarUrl: fmt.Sprintf(iconFmtString, c.Icon),
			Game:      types.StarRail,
			Name:      c.Name,
		})
	}

	return characters
}
