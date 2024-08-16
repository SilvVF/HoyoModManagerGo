package api

import (
	"encoding/json"
	"fmt"
	"hmm/pkg/log"
	"hmm/pkg/types"
	"io"
	"net/http"
	"strings"
)

type GenshinApi struct {
}

func (g *GenshinApi) SkinId() int {
	return 18140
}

func (g *GenshinApi) GetGame() types.Game {
	return types.Genshin
}

func (g *GenshinApi) Elements() []string {
	return []string{"Anemo", "Cryo", "Dendro", "Electro", "Geo", "Hydro", "Pyro"}
}

func genshinCharUrl(path string) string {
	return "https://raw.githubusercontent.com/theBowja/genshin-db/main/src/data/English/characters/" + path
}

func avatarIconUrl(name string) string {

	avatar := func(folder string, path string) string {
		return fmt.Sprintf("https://raw.githubusercontent.com/frzyc/genshin-optimizer/master/libs/gi/assets/src/gen/chars/%1s/UI_AvatarIcon_%2s.png", folder, path)
	}

	switch strings.ToLower(name) {
	case "aether":
		return avatar("TravelerM", "PlayerBoy")
	case "lumine":
		return avatar("TravelerF", "PlayerGirl")
	case "shikanoin heizou":
		return avatar("ShikanoinHeizou", "Heizo")
	case "raiden shogun":
		return avatar("RaidenShogun", "Shougun")
	case "yae miko":
		return avatar("YaeMiko", "Yae")
	case "yun jin":
		return avatar("YunJin", "Yunjin")
	case "yanfei":
		return avatar("Yanfei", "Feiyan")
	case "jean":
		return avatar("Jean", "Qin")
	case "lyney":
		return avatar("Lyney", "Liney")
	case "xianyun":
		return avatar("Xianyun", "Liuyun")
	case "thoma":
		return avatar("Thoma", "Tohma")
	case "hu tao":
		return avatar("HuTao", "Hutao")
	case "kirara":
		return avatar("Kirara", "Momoka")
	case "baizhu":
		return avatar("Baizhu", "Baizhuer")
	case "alhaitham":
		return avatar("Alhaitham", "Alhatham")
	case "amber":
		return avatar("Amber", "Ambor")
	case "lynette":
		return avatar("Lynette", "Linette")
	case "noelle":
		return avatar("Noelle", "Noel")
	default:
		split := strings.Split(name, " ")
		last := split[len(split)-1]

		sanitized := strings.ToUpper(string(last[0])) + strings.ReplaceAll(strings.ToLower(last[1:]), " ", "")
		folder := strings.ReplaceAll(name, " ", "")

		return avatar(folder, sanitized)
	}
}

func (g *GenshinApi) Characters() []types.Character {
	resp, err := http.Get("https://api.github.com/repos/theBowja/genshin-db/contents/src/data/English/characters")

	if err != nil {
		return make([]types.Character, 0)
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)

	var nameJson []struct {
		Name string `json:"name"`
	}

	json.Unmarshal(body, &nameJson)
	if err != nil {
		return make([]types.Character, 0)
	}

	chars := make([]types.Character, len(nameJson))

	for _, c := range nameJson {

		name := strings.ReplaceAll(c.Name, " ", "")
		name = strings.ToLower(name)

		url := genshinCharUrl(name)
		resp, err := http.Get(url)

		log.LogPrint(name)

		if err != nil {
			log.LogPrint(err.Error())
			continue
		}
		defer resp.Body.Close()
		body, err := io.ReadAll(resp.Body)
		if err != nil {
			log.LogPrint(err.Error())
			continue
		}

		var characterJson struct {
			Id      int    `json:"id"`
			Name    string `json:"name"`
			Element string `json:"elementText"`
		}

		err = json.Unmarshal(body, &characterJson)

		if err != nil {
			log.LogPrint(err.Error())
			continue
		}

		log.LogPrint(characterJson.Name + "name for" + name)

		if characterJson.Name != "" {
			chars = append(
				chars,
				types.Character{
					Id:        characterJson.Id,
					Name:      characterJson.Name,
					Element:   characterJson.Element,
					Game:      types.Genshin,
					AvatarUrl: avatarIconUrl(characterJson.Name),
				},
			)
		}
	}

	return chars
}
