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

	GB_URL = "https://gamebanana.com/apiv11"
)

type Sort string

type GbApi struct{}

type CategoryListResponseItem struct {
	IdRow         int    `json:"_idRow,omitempty"`
	CategoryCount int    `json:"_nCategoryCount,omitempty"`
	ItemCount     int    `json:"_nItemCount,omitempty"`
	Name          string `json:"_sName,omitempty"`
	Url           string `json:"_sUrl,omitempty"`
}

type CategoryRecord struct {
	IDRow          int      `json:"_idRow,omitempty"`
	SModelName     string   `json:"_sModelName,omitempty"`
	SSingularTitle string   `json:"_sSingularTitle,omitempty"`
	SIconClasses   string   `json:"_sIconClasses,omitempty"`
	SName          string   `json:"_sName,omitempty"`
	SProfileURL    string   `json:"_sProfileUrl,omitempty"`
	TsDateAdded    int      `json:"_tsDateAdded,omitempty"`
	TsDateModified int      `json:"_tsDateModified,omitempty"`
	BHasFiles      bool     `json:"_bHasFiles,omitempty"`
	ATags          []string `json:"_aTags,omitempty"`
	APreviewMedia  struct {
		AImages []struct {
			SType    string `json:"_sType,omitempty"`
			SBaseURL string `json:"_sBaseUrl,omitempty"`
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
		} `json:"_aImages,omitempty"`
	} `json:"_aPreviewMedia,omitempty"`
	ASubmitter struct {
		IDRow                 int    `json:"_idRow,omitempty"`
		SName                 string `json:"_sName,omitempty"`
		BIsOnline             bool   `json:"_bIsOnline,omitempty"`
		BHasRipe              bool   `json:"_bHasRipe,omitempty"`
		SProfileURL           string `json:"_sProfileUrl,omitempty"`
		SAvatarURL            string `json:"_sAvatarUrl,omitempty"`
		SHdAvatarUrl          string `json:"_sHdAvatarUrl,omitempty"`
		SUpicUrl              string `json:"_sUpicUrl,omitempty"`
		SSubjectShaperCssCode string `json:"_sSubjectShaperCssCode,omitempty"`
	} `json:"_aSubmitter,omitempty"`
	AGame struct {
		IDRow       int    `json:"_idRow,omitempty"`
		SName       string `json:"_sName,omitempty"`
		SProfileURL string `json:"_sProfileUrl,omitempty"`
		SIconURL    string `json:"_sIconUrl,omitempty"`
	} `json:"_aGame,omitempty"`
	ARootCategory struct {
		SName       string `json:"_sName,omitempty"`
		SProfileURL string `json:"_sProfileUrl,omitempty"`
		SIconURL    string `json:"_sIconUrl,omitempty"`
	} `json:"_aRootCategory,omitempty"`
	SVersion           string `json:"_sVersion,omitempty"`
	BIsObsolete        bool   `json:"_bIsObsolete,omitempty"`
	SInitialVisibility string `json:"_sInitialVisibility,omitempty"`
	BHasContentRatings bool   `json:"_bHasContentRatings,omitempty"`
	NLikeCount         int    `json:"_nLikeCount,omitempty"`
	NPostCount         int    `json:"_nPostCount,omitempty"`
	BWasFeatured       bool   `json:"_bWasFeatured,omitempty"`
	NViewCount         int    `json:"_nViewCount,omitempty"`
	BIsOwnedByAccessor bool   `json:"_bIsOwnedByAccessor,omitempty"`
	TsDateUpdated      int    `json:"_tsDateUpdated,omitempty"`
}

type CategoryResponse struct {
	AMetadata struct {
		NRecordCount int  `json:"_nRecordCount,omitempty"`
		BIsComplete  bool `json:"_bIsComplete,omitempty"`
		NPerpage     int  `json:"_nPerpage,omitempty"`
	} `json:"_aMetadata,omitempty"`
	ARecords []CategoryRecord `json:"_aRecords,omitempty"`
}

func (g *GbApi) Categories(id int) []CategoryListResponseItem {
	url := fmt.Sprintf("%s/Mod/Categories?_idCategoryRow=%d&_sSort=a_to_z&_bShowEmpty=true", GB_URL, id)

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

func (g *GbApi) ModPage(id int) ModPageResponse {
	url := fmt.Sprintf("%s/Mod/%d/ProfilePage", GB_URL, id)
	resp, err := http.Get(url)
	if err != nil {
		log.LogPrint(err.Error())
		return ModPageResponse{}
	}

	defer resp.Body.Close()

	b, err := io.ReadAll(resp.Body)
	if err != nil {
		log.LogPrint(err.Error())
		return ModPageResponse{}
	}

	var modPage ModPageResponse

	err = json.Unmarshal(b, &modPage)
	if err != nil {
		log.LogPrint(err.Error())
		return ModPageResponse{}
	}

	return modPage
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

	url := fmt.Sprintf("%s/Mod/Index?_nPerpage=%d&_aFilters[Generic_Category]=%d%s&_nPage=%d", GB_URL, perPage, id, sortQuery, page)
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

type ModPageResponse struct {
	IDRow                     int64           `json:"_idRow,omitempty"`
	NStatus                   string          `json:"_nStatus,omitempty"`
	BIsPrivate                bool            `json:"_bIsPrivate,omitempty"`
	TsDateModified            int64           `json:"_tsDateModified,omitempty"`
	TsDateAdded               int64           `json:"_tsDateAdded,omitempty"`
	SProfileURL               string          `json:"_sProfileUrl,omitempty"`
	APreviewMedia             APreviewMedia   `json:"_aPreviewMedia,omitempty"`
	SCommentsMode             string          `json:"_sCommentsMode,omitempty"`
	BAccessorIsSubmitter      bool            `json:"_bAccessorIsSubmitter,omitempty"`
	BIsTrashed                bool            `json:"_bIsTrashed,omitempty"`
	BIsWithheld               bool            `json:"_bIsWithheld,omitempty"`
	SName                     string          `json:"_sName,omitempty"`
	NUpdatesCount             int64           `json:"_nUpdatesCount,omitempty"`
	BHasUpdates               bool            `json:"_bHasUpdates,omitempty"`
	TsDateUpdated             int64           `json:"_tsDateUpdated,omitempty"`
	NAllTodosCount            int64           `json:"_nAllTodosCount,omitempty"`
	BHasTodos                 bool            `json:"_bHasTodos,omitempty"`
	NPostCount                int64           `json:"_nPostCount,omitempty"`
	BCreatedBySubmitter       bool            `json:"_bCreatedBySubmitter,omitempty"`
	BIsPorted                 bool            `json:"_bIsPorted,omitempty"`
	NThanksCount              int64           `json:"_nThanksCount,omitempty"`
	AContentRatings           AContentRatings `json:"_aContentRatings,omitempty"`
	SInitialVisibility        string          `json:"_sInitialVisibility,omitempty"`
	SDownloadURL              string          `json:"_sDownloadUrl,omitempty"`
	NDownloadCount            int64           `json:"_nDownloadCount,omitempty"`
	AFiles                    []AFile         `json:"_aFiles,omitempty"`
	NSubscriberCount          int64           `json:"_nSubscriberCount,omitempty"`
	AContributingStudios      []interface{}   `json:"_aContributingStudios,omitempty"`
	SLicense                  string          `json:"_sLicense,omitempty"`
	BGenerateTableOfContents  bool            `json:"_bGenerateTableOfContents,omitempty"`
	SText                     string          `json:"_sText,omitempty"`
	BIsObsolete               bool            `json:"_bIsObsolete,omitempty"`
	NLikeCount                int64           `json:"_nLikeCount,omitempty"`
	NViewCount                int64           `json:"_nViewCount,omitempty"`
	SVersion                  string          `json:"_sVersion,omitempty"`
	BAcceptsDonations         bool            `json:"_bAcceptsDonations,omitempty"`
	BShowRipePromo            bool            `json:"_bShowRipePromo,omitempty"`
	ASubmitter                ASubmitter      `json:"_aSubmitter,omitempty"`
	AGame                     AGame           `json:"_aGame,omitempty"`
	ACategory                 Category        `json:"_aCategory,omitempty"`
	ASuperCategory            Category        `json:"_aSuperCategory,omitempty"`
	IDAccessorSubscriptionRow int64           `json:"_idAccessorSubscriptionRow,omitempty"`
	BAccessorIsSubscribed     bool            `json:"_bAccessorIsSubscribed,omitempty"`
	BAccessorHasThanked       bool            `json:"_bAccessorHasThanked,omitempty"`
	BAccessorHasUnliked       bool            `json:"_bAccessorHasUnliked,omitempty"`
	BAccessorHasLiked         bool            `json:"_bAccessorHasLiked,omitempty"`
}

type Category struct {
	IDRow       int64  `json:"_idRow,omitempty"`
	SName       string `json:"_sName,omitempty"`
	SModelName  string `json:"_sModelName,omitempty"`
	SProfileURL string `json:"_sProfileUrl,omitempty"`
	SIconURL    string `json:"_sIconUrl,omitempty"`
}

type AContentRatings map[string]string

type AFile struct {
	IDRow               int64  `json:"_idRow,omitempty"`
	SFile               string `json:"_sFile,omitempty"`
	NFilesize           int64  `json:"_nFilesize,omitempty"`
	SDescription        string `json:"_sDescription,omitempty"`
	TsDateAdded         int64  `json:"_tsDateAdded,omitempty"`
	NDownloadCount      int64  `json:"_nDownloadCount,omitempty"`
	SAnalysisState      string `json:"_sAnalysisState,omitempty"`
	SAnalysisResultCode string `json:"_sAnalysisResultCode,omitempty"`
	SAnalysisResult     string `json:"_sAnalysisResult,omitempty"`
	BContainsExe        bool   `json:"_bContainsExe,omitempty"`
	SDownloadURL        string `json:"_sDownloadUrl,omitempty"`
	SMd5Checksum        string `json:"_sMd5Checksum,omitempty"`
	SClamAVResult       string `json:"_sClamAvResult,omitempty"`
	SAvastAVResult      string `json:"_sAvastAvResult,omitempty"`
}

type AGame struct {
	IDRow                     int64  `json:"_idRow,omitempty"`
	SName                     string `json:"_sName,omitempty"`
	SAbbreviation             string `json:"_sAbbreviation,omitempty"`
	SProfileURL               string `json:"_sProfileUrl,omitempty"`
	SIconURL                  string `json:"_sIconUrl,omitempty"`
	SBannerURL                string `json:"_sBannerUrl,omitempty"`
	NSubscriberCount          int64  `json:"_nSubscriberCount,omitempty"`
	BHasSubmissionQueue       bool   `json:"_bHasSubmissionQueue,omitempty"`
	BAccessorIsSubscribed     bool   `json:"_bAccessorIsSubscribed,omitempty"`
	IDAccessorSubscriptionRow int64  `json:"_idAccessorSubscriptionRow,omitempty"`
}

type APreviewMedia struct {
	AImages []AImage `json:"_aImages,omitempty"`
}

type AImage struct {
	SType    string  `json:"_sType,omitempty"`
	SBaseURL string  `json:"_sBaseUrl,omitempty"`
	SFile    string  `json:"_sFile,omitempty"`
	SFile220 *string `json:"_sFile220,omitempty"`
	HFile220 *int64  `json:"_hFile220,omitempty"`
	WFile220 *int64  `json:"_wFile220,omitempty"`
	SFile530 *string `json:"_sFile530,omitempty"`
	HFile530 *int64  `json:"_hFile530,omitempty"`
	WFile530 *int64  `json:"_wFile530,omitempty"`
	SFile100 string  `json:"_sFile100,omitempty"`
	HFile100 int64   `json:"_hFile100,omitempty"`
	WFile100 int64   `json:"_wFile100,omitempty"`
	SFile800 *string `json:"_sFile800,omitempty"`
	HFile800 *int64  `json:"_hFile800,omitempty"`
	WFile800 *int64  `json:"_wFile800,omitempty"`
}

type ASubmitter struct {
	IDRow                           int64  `json:"_idRow,omitempty"`
	SName                           string `json:"_sName,omitempty"`
	SUserTitle                      string `json:"_sUserTitle,omitempty"`
	SHonoraryTitle                  string `json:"_sHonoraryTitle,omitempty"`
	TsJoinDate                      int64  `json:"_tsJoinDate,omitempty"`
	SAvatarURL                      string `json:"_sAvatarUrl,omitempty"`
	SSigURL                         string `json:"_sSigUrl,omitempty"`
	SProfileURL                     string `json:"_sProfileUrl,omitempty"`
	SPointsURL                      string `json:"_sPointsUrl,omitempty"`
	SMedalsURL                      string `json:"_sMedalsUrl,omitempty"`
	BIsOnline                       bool   `json:"_bIsOnline,omitempty"`
	SLocation                       string `json:"_sLocation,omitempty"`
	SOnlineTitle                    string `json:"_sOnlineTitle,omitempty"`
	SOfflineTitle                   string `json:"_sOfflineTitle,omitempty"`
	NPoints                         int64  `json:"_nPoints,omitempty"`
	NPointsRank                     int64  `json:"_nPointsRank,omitempty"`
	BHasRipe                        bool   `json:"_bHasRipe,omitempty"`
	SSubjectShaperCSSCode           string `json:"_sSubjectShaperCssCode,omitempty"`
	SCooltipCSSCode                 string `json:"_sCooltipCssCode,omitempty"`
	NBuddyCount                     int64  `json:"_nBuddyCount,omitempty"`
	NSubscriberCount                int64  `json:"_nSubscriberCount,omitempty"`
	BAccessorIsBuddy                bool   `json:"_bAccessorIsBuddy,omitempty"`
	BBuddyRequestExistsWithAccessor bool   `json:"_bBuddyRequestExistsWithAccessor,omitempty"`
	BAccessorIsSubscribed           bool   `json:"_bAccessorIsSubscribed,omitempty"`
	SUpicURL                        string `json:"_sUpicUrl,omitempty"`
	SHDAvatarURL                    string `json:"_sHdAvatarUrl,omitempty"`
}
