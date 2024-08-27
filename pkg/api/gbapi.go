package api

import (
	"encoding/json"
	"fmt"
	"hmm/pkg/log"
	"io"
	"net/http"
)

const (
	MostLiked      Sort = "MostLiked"
	MostDownloaded Sort = "MostDownloaded"
	MostViewed     Sort = "MostViewed"

	BASE_URL = "https://gamebanana.com/apiv11"
)

type Sort string

type GbApi struct{}

type CategoryListResponseItem struct {
	IdRow         int    `json:"_idRow"`
	CategoryCount int    `json:"_nCategoryCount"`
	ItemCount     int    `json:"_nItemCount"`
	Name          string `json:"_sName"`
	Url           string `json:"_sUrl"`
}

type CategoryRecord struct {
	IDRow          int      `json:"_idRow"`
	SModelName     string   `json:"_sModelName"`
	SSingularTitle string   `json:"_sSingularTitle"`
	SIconClasses   string   `json:"_sIconClasses"`
	SName          string   `json:"_sName"`
	SProfileURL    string   `json:"_sProfileUrl"`
	TsDateAdded    int      `json:"_tsDateAdded"`
	TsDateModified int      `json:"_tsDateModified"`
	BHasFiles      bool     `json:"_bHasFiles"`
	ATags          []string `json:"_aTags"`
	APreviewMedia  struct {
		AImages []struct {
			SType    string `json:"_sType"`
			SBaseURL string `json:"_sBaseUrl"`
			SFile    string `json:"_sFile,omitempty"`
			SFile220 string `json:"_sFile220,omitempty"`
			HFile220 int    `json:"_hFile220,omitempty"`
			WFile220 int    `json:"_wFile220,omitempty"`
			SFile530 string `json:"_sFile530,omitempty"`
			HFile530 int    `json:"_hFile530,omitempty"`
			WFile530 int    `json:"_wFile530,omitempty"`
			SFile100 string `json:"_sFile100,omitempty"`
			HFile100 int    `json:"_hFile100,omitempty"`
			WFile100 int    `json:"_wFile100,omitempty"`
		} `json:"_aImages"`
	} `json:"_aPreviewMedia"`
	ASubmitter struct {
		IDRow       int    `json:"_idRow"`
		SName       string `json:"_sName"`
		BIsOnline   bool   `json:"_bIsOnline"`
		BHasRipe    bool   `json:"_bHasRipe"`
		SProfileURL string `json:"_sProfileUrl"`
		SAvatarURL  string `json:"_sAvatarUrl"`
	} `json:"_aSubmitter,omitempty"`
	AGame struct {
		IDRow       int    `json:"_idRow"`
		SName       string `json:"_sName"`
		SProfileURL string `json:"_sProfileUrl"`
		SIconURL    string `json:"_sIconUrl"`
	} `json:"_aGame"`
	ARootCategory struct {
		SName       string `json:"_sName"`
		SProfileURL string `json:"_sProfileUrl"`
		SIconURL    string `json:"_sIconUrl"`
	} `json:"_aRootCategory"`
	SVersion           string `json:"_sVersion"`
	BIsObsolete        bool   `json:"_bIsObsolete"`
	SInitialVisibility string `json:"_sInitialVisibility"`
	BHasContentRatings bool   `json:"_bHasContentRatings"`
	NLikeCount         int    `json:"_nLikeCount"`
	NPostCount         int    `json:"_nPostCount,omitempty"`
	BWasFeatured       bool   `json:"_bWasFeatured"`
	NViewCount         int    `json:"_nViewCount"`
	BIsOwnedByAccessor bool   `json:"_bIsOwnedByAccessor"`
	TsDateUpdated      int    `json:"_tsDateUpdated,omitempty"`
}

type CategoryResponse struct {
	AMetadata struct {
		NRecordCount int  `json:"_nRecordCount"`
		BIsComplete  bool `json:"_bIsComplete"`
		NPerpage     int  `json:"_nPerpage"`
	} `json:"_aMetadata"`
	ARecords []CategoryRecord `json:"_aRecords"`
}

func (g *GbApi) Categories(id int) []CategoryListResponseItem {
	url := fmt.Sprintf("%s/Mod/Categories?_idCategoryRow=%d&_sSort=a_to_z&_bShowEmpty=true", BASE_URL, id)

	resp, err := http.Get(url)
	if err != nil {
		log.LogPrint(err.Error())
		return make([]CategoryListResponseItem, 0)
	}

	defer resp.Body.Close()

	b, err := io.ReadAll(resp.Body)
	if err != nil {
		log.LogPrint(err.Error())
		return make([]CategoryListResponseItem, 0)
	}

	var items []CategoryListResponseItem

	err = json.Unmarshal(b, &items)
	if err != nil {
		log.LogPrint(err.Error())
		return make([]CategoryListResponseItem, 0)
	}

	return items
}

func (g *GbApi) CategoryContent(
	id int,
	perPage int,
	page int,
	sort string,
) CategoryResponse {
	sortQuery := ""
	if sort != "" {
		sortQuery = fmt.Sprintf("&_sSort=Generic_%s", sort)
	}

	if perPage == 0 {
		perPage = 15
	}

	if page <= 0 {
		page = 1
	}

	url := fmt.Sprintf("%s/Mod/Index?_nPerpage=%d&_aFilters[Generic_Category]=%d%s&_nPage=%d", BASE_URL, perPage, id, sortQuery, page)
	log.LogPrint(url)
	resp, err := http.Get(url)
	if err != nil {
		log.LogPrint(err.Error())
		return CategoryResponse{}
	}

	defer resp.Body.Close()

	b, err := io.ReadAll(resp.Body)
	if err != nil {
		log.LogPrint(err.Error())
		return CategoryResponse{}
	}

	var category CategoryResponse

	err = json.Unmarshal(b, &category)
	if err != nil {
		log.LogPrint(err.Error())
		return CategoryResponse{}
	}

	return category
}
