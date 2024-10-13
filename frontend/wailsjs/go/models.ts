export namespace api {
	
	export class AFile {
	    _idRow?: number;
	    _sFile?: string;
	    _nFilesize?: number;
	    _sDescription?: string;
	    _tsDateAdded?: number;
	    _nDownloadCount?: number;
	    _sAnalysisState?: string;
	    _sAnalysisResultCode?: string;
	    _sAnalysisResult?: string;
	    _bContainsExe?: boolean;
	    _sDownloadUrl?: string;
	    _sMd5Checksum?: string;
	    _sClamAvResult?: string;
	    _sAvastAvResult?: string;
	
	    static createFrom(source: any = {}) {
	        return new AFile(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this._idRow = source["_idRow"];
	        this._sFile = source["_sFile"];
	        this._nFilesize = source["_nFilesize"];
	        this._sDescription = source["_sDescription"];
	        this._tsDateAdded = source["_tsDateAdded"];
	        this._nDownloadCount = source["_nDownloadCount"];
	        this._sAnalysisState = source["_sAnalysisState"];
	        this._sAnalysisResultCode = source["_sAnalysisResultCode"];
	        this._sAnalysisResult = source["_sAnalysisResult"];
	        this._bContainsExe = source["_bContainsExe"];
	        this._sDownloadUrl = source["_sDownloadUrl"];
	        this._sMd5Checksum = source["_sMd5Checksum"];
	        this._sClamAvResult = source["_sClamAvResult"];
	        this._sAvastAvResult = source["_sAvastAvResult"];
	    }
	}
	export class AGame {
	    _idRow?: number;
	    _sName?: string;
	    _sAbbreviation?: string;
	    _sProfileUrl?: string;
	    _sIconUrl?: string;
	    _sBannerUrl?: string;
	    _nSubscriberCount?: number;
	    _bHasSubmissionQueue?: boolean;
	    _bAccessorIsSubscribed?: boolean;
	    _idAccessorSubscriptionRow?: number;
	
	    static createFrom(source: any = {}) {
	        return new AGame(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this._idRow = source["_idRow"];
	        this._sName = source["_sName"];
	        this._sAbbreviation = source["_sAbbreviation"];
	        this._sProfileUrl = source["_sProfileUrl"];
	        this._sIconUrl = source["_sIconUrl"];
	        this._sBannerUrl = source["_sBannerUrl"];
	        this._nSubscriberCount = source["_nSubscriberCount"];
	        this._bHasSubmissionQueue = source["_bHasSubmissionQueue"];
	        this._bAccessorIsSubscribed = source["_bAccessorIsSubscribed"];
	        this._idAccessorSubscriptionRow = source["_idAccessorSubscriptionRow"];
	    }
	}
	export class AImage {
	    _sType?: string;
	    _sBaseUrl?: string;
	    _sFile?: string;
	    _sFile220?: string;
	    _hFile220?: number;
	    _wFile220?: number;
	    _sFile530?: string;
	    _hFile530?: number;
	    _wFile530?: number;
	    _sFile100?: string;
	    _hFile100?: number;
	    _wFile100?: number;
	    _sFile800?: string;
	    _hFile800?: number;
	    _wFile800?: number;
	
	    static createFrom(source: any = {}) {
	        return new AImage(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this._sType = source["_sType"];
	        this._sBaseUrl = source["_sBaseUrl"];
	        this._sFile = source["_sFile"];
	        this._sFile220 = source["_sFile220"];
	        this._hFile220 = source["_hFile220"];
	        this._wFile220 = source["_wFile220"];
	        this._sFile530 = source["_sFile530"];
	        this._hFile530 = source["_hFile530"];
	        this._wFile530 = source["_wFile530"];
	        this._sFile100 = source["_sFile100"];
	        this._hFile100 = source["_hFile100"];
	        this._wFile100 = source["_wFile100"];
	        this._sFile800 = source["_sFile800"];
	        this._hFile800 = source["_hFile800"];
	        this._wFile800 = source["_wFile800"];
	    }
	}
	export class APreviewMedia {
	    _aImages?: AImage[];
	
	    static createFrom(source: any = {}) {
	        return new APreviewMedia(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this._aImages = this.convertValues(source["_aImages"], AImage);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class ASubmitter {
	    _idRow?: number;
	    _sName?: string;
	    _sUserTitle?: string;
	    _sHonoraryTitle?: string;
	    _tsJoinDate?: number;
	    _sAvatarUrl?: string;
	    _sSigUrl?: string;
	    _sProfileUrl?: string;
	    _sPointsUrl?: string;
	    _sMedalsUrl?: string;
	    _bIsOnline?: boolean;
	    _sLocation?: string;
	    _sOnlineTitle?: string;
	    _sOfflineTitle?: string;
	    _nPoints?: number;
	    _nPointsRank?: number;
	    _bHasRipe?: boolean;
	    _sSubjectShaperCssCode?: string;
	    _sCooltipCssCode?: string;
	    _nBuddyCount?: number;
	    _nSubscriberCount?: number;
	    _bAccessorIsBuddy?: boolean;
	    _bBuddyRequestExistsWithAccessor?: boolean;
	    _bAccessorIsSubscribed?: boolean;
	    _sUpicUrl?: string;
	    _sHdAvatarUrl?: string;
	
	    static createFrom(source: any = {}) {
	        return new ASubmitter(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this._idRow = source["_idRow"];
	        this._sName = source["_sName"];
	        this._sUserTitle = source["_sUserTitle"];
	        this._sHonoraryTitle = source["_sHonoraryTitle"];
	        this._tsJoinDate = source["_tsJoinDate"];
	        this._sAvatarUrl = source["_sAvatarUrl"];
	        this._sSigUrl = source["_sSigUrl"];
	        this._sProfileUrl = source["_sProfileUrl"];
	        this._sPointsUrl = source["_sPointsUrl"];
	        this._sMedalsUrl = source["_sMedalsUrl"];
	        this._bIsOnline = source["_bIsOnline"];
	        this._sLocation = source["_sLocation"];
	        this._sOnlineTitle = source["_sOnlineTitle"];
	        this._sOfflineTitle = source["_sOfflineTitle"];
	        this._nPoints = source["_nPoints"];
	        this._nPointsRank = source["_nPointsRank"];
	        this._bHasRipe = source["_bHasRipe"];
	        this._sSubjectShaperCssCode = source["_sSubjectShaperCssCode"];
	        this._sCooltipCssCode = source["_sCooltipCssCode"];
	        this._nBuddyCount = source["_nBuddyCount"];
	        this._nSubscriberCount = source["_nSubscriberCount"];
	        this._bAccessorIsBuddy = source["_bAccessorIsBuddy"];
	        this._bBuddyRequestExistsWithAccessor = source["_bBuddyRequestExistsWithAccessor"];
	        this._bAccessorIsSubscribed = source["_bAccessorIsSubscribed"];
	        this._sUpicUrl = source["_sUpicUrl"];
	        this._sHdAvatarUrl = source["_sHdAvatarUrl"];
	    }
	}
	export class Category {
	    _idRow?: number;
	    _sName?: string;
	    _sModelName?: string;
	    _sProfileUrl?: string;
	    _sIconUrl?: string;
	
	    static createFrom(source: any = {}) {
	        return new Category(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this._idRow = source["_idRow"];
	        this._sName = source["_sName"];
	        this._sModelName = source["_sModelName"];
	        this._sProfileUrl = source["_sProfileUrl"];
	        this._sIconUrl = source["_sIconUrl"];
	    }
	}
	export class CategoryListResponseItem {
	    _idRow?: number;
	    _nCategoryCount?: number;
	    _nItemCount?: number;
	    _sName?: string;
	    _sUrl?: string;
	
	    static createFrom(source: any = {}) {
	        return new CategoryListResponseItem(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this._idRow = source["_idRow"];
	        this._nCategoryCount = source["_nCategoryCount"];
	        this._nItemCount = source["_nItemCount"];
	        this._sName = source["_sName"];
	        this._sUrl = source["_sUrl"];
	    }
	}
	export class CategoryRecord {
	    _idRow?: number;
	    _sModelName?: string;
	    _sSingularTitle?: string;
	    _sIconClasses?: string;
	    _sName?: string;
	    _sProfileUrl?: string;
	    _tsDateAdded?: number;
	    _tsDateModified?: number;
	    _bHasFiles?: boolean;
	    _aTags?: string[];
	    // Go type: struct { AImages []struct { SType string "json:\"_sType,omitempty\""; SBaseURL string "json:\"_sBaseUrl,omitempty\""; SFile string "json:\"_sFile,omitempty\""; SFile220 string "json:\"_sFile220,omitempty\""; HFile220 int "json:\"_hFile220,omitempty\""; WFile220 int "json:\"_wFile220,omitempty\""; SFile530 string "json:\"_sFile530,omitempty\""; HFile530 int "json:\"_hFile530,omitempty\""; WFile530 int "json:\"_wFile530,omitempty\""; SFile100 string "json:\"_sFile100,omitempty\""; HFile100 int "json:\"_hFile100,omitempty\""; WFile100 int "json:\"_wFile100,omitempty\"" } "json:\"_aImages,omitempty\"" }
	    _aPreviewMedia?: any;
	    // Go type: struct { IDRow int "json:\"_idRow,omitempty\""; SName string "json:\"_sName,omitempty\""; BIsOnline bool "json:\"_bIsOnline,omitempty\""; BHasRipe bool "json:\"_bHasRipe,omitempty\""; SProfileURL string "json:\"_sProfileUrl,omitempty\""; SAvatarURL string "json:\"_sAvatarUrl,omitempty\""; SHdAvatarUrl string "json:\"_sHdAvatarUrl,omitempty\""; SUpicUrl string "json:\"_sUpicUrl,omitempty\""; SSubjectShaperCssCode string "json:\"_sSubjectShaperCssCode,omitempty\"" }
	    _aSubmitter?: any;
	    // Go type: struct { IDRow int "json:\"_idRow,omitempty\""; SName string "json:\"_sName,omitempty\""; SProfileURL string "json:\"_sProfileUrl,omitempty\""; SIconURL string "json:\"_sIconUrl,omitempty\"" }
	    _aGame?: any;
	    // Go type: struct { SName string "json:\"_sName,omitempty\""; SProfileURL string "json:\"_sProfileUrl,omitempty\""; SIconURL string "json:\"_sIconUrl,omitempty\"" }
	    _aRootCategory?: any;
	    _sVersion?: string;
	    _bIsObsolete?: boolean;
	    _sInitialVisibility?: string;
	    _bHasContentRatings?: boolean;
	    _nLikeCount?: number;
	    _nPostCount?: number;
	    _bWasFeatured?: boolean;
	    _nViewCount?: number;
	    _bIsOwnedByAccessor?: boolean;
	    _tsDateUpdated?: number;
	
	    static createFrom(source: any = {}) {
	        return new CategoryRecord(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this._idRow = source["_idRow"];
	        this._sModelName = source["_sModelName"];
	        this._sSingularTitle = source["_sSingularTitle"];
	        this._sIconClasses = source["_sIconClasses"];
	        this._sName = source["_sName"];
	        this._sProfileUrl = source["_sProfileUrl"];
	        this._tsDateAdded = source["_tsDateAdded"];
	        this._tsDateModified = source["_tsDateModified"];
	        this._bHasFiles = source["_bHasFiles"];
	        this._aTags = source["_aTags"];
	        this._aPreviewMedia = this.convertValues(source["_aPreviewMedia"], Object);
	        this._aSubmitter = this.convertValues(source["_aSubmitter"], Object);
	        this._aGame = this.convertValues(source["_aGame"], Object);
	        this._aRootCategory = this.convertValues(source["_aRootCategory"], Object);
	        this._sVersion = source["_sVersion"];
	        this._bIsObsolete = source["_bIsObsolete"];
	        this._sInitialVisibility = source["_sInitialVisibility"];
	        this._bHasContentRatings = source["_bHasContentRatings"];
	        this._nLikeCount = source["_nLikeCount"];
	        this._nPostCount = source["_nPostCount"];
	        this._bWasFeatured = source["_bWasFeatured"];
	        this._nViewCount = source["_nViewCount"];
	        this._bIsOwnedByAccessor = source["_bIsOwnedByAccessor"];
	        this._tsDateUpdated = source["_tsDateUpdated"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class CategoryResponse {
	    // Go type: struct { NRecordCount int "json:\"_nRecordCount,omitempty\""; BIsComplete bool "json:\"_bIsComplete,omitempty\""; NPerpage int "json:\"_nPerpage,omitempty\"" }
	    _aMetadata?: any;
	    _aRecords?: CategoryRecord[];
	
	    static createFrom(source: any = {}) {
	        return new CategoryResponse(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this._aMetadata = this.convertValues(source["_aMetadata"], Object);
	        this._aRecords = this.convertValues(source["_aRecords"], CategoryRecord);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class ModPageResponse {
	    _idRow?: number;
	    _nStatus?: string;
	    _bIsPrivate?: boolean;
	    _tsDateModified?: number;
	    _tsDateAdded?: number;
	    _sProfileUrl?: string;
	    _aPreviewMedia?: APreviewMedia;
	    _sCommentsMode?: string;
	    _bAccessorIsSubmitter?: boolean;
	    _bIsTrashed?: boolean;
	    _bIsWithheld?: boolean;
	    _sName?: string;
	    _nUpdatesCount?: number;
	    _bHasUpdates?: boolean;
	    _tsDateUpdated?: number;
	    _nAllTodosCount?: number;
	    _bHasTodos?: boolean;
	    _nPostCount?: number;
	    _bCreatedBySubmitter?: boolean;
	    _bIsPorted?: boolean;
	    _nThanksCount?: number;
	    _aContentRatings?: {[key: string]: string};
	    _sInitialVisibility?: string;
	    _sDownloadUrl?: string;
	    _nDownloadCount?: number;
	    _aFiles?: AFile[];
	    _nSubscriberCount?: number;
	    _aContributingStudios?: any[];
	    _sLicense?: string;
	    _bGenerateTableOfContents?: boolean;
	    _sText?: string;
	    _bIsObsolete?: boolean;
	    _nLikeCount?: number;
	    _nViewCount?: number;
	    _sVersion?: string;
	    _bAcceptsDonations?: boolean;
	    _bShowRipePromo?: boolean;
	    _aSubmitter?: ASubmitter;
	    _aGame?: AGame;
	    _aCategory?: Category;
	    _aSuperCategory?: Category;
	    _idAccessorSubscriptionRow?: number;
	    _bAccessorIsSubscribed?: boolean;
	    _bAccessorHasThanked?: boolean;
	    _bAccessorHasUnliked?: boolean;
	    _bAccessorHasLiked?: boolean;
	
	    static createFrom(source: any = {}) {
	        return new ModPageResponse(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this._idRow = source["_idRow"];
	        this._nStatus = source["_nStatus"];
	        this._bIsPrivate = source["_bIsPrivate"];
	        this._tsDateModified = source["_tsDateModified"];
	        this._tsDateAdded = source["_tsDateAdded"];
	        this._sProfileUrl = source["_sProfileUrl"];
	        this._aPreviewMedia = this.convertValues(source["_aPreviewMedia"], APreviewMedia);
	        this._sCommentsMode = source["_sCommentsMode"];
	        this._bAccessorIsSubmitter = source["_bAccessorIsSubmitter"];
	        this._bIsTrashed = source["_bIsTrashed"];
	        this._bIsWithheld = source["_bIsWithheld"];
	        this._sName = source["_sName"];
	        this._nUpdatesCount = source["_nUpdatesCount"];
	        this._bHasUpdates = source["_bHasUpdates"];
	        this._tsDateUpdated = source["_tsDateUpdated"];
	        this._nAllTodosCount = source["_nAllTodosCount"];
	        this._bHasTodos = source["_bHasTodos"];
	        this._nPostCount = source["_nPostCount"];
	        this._bCreatedBySubmitter = source["_bCreatedBySubmitter"];
	        this._bIsPorted = source["_bIsPorted"];
	        this._nThanksCount = source["_nThanksCount"];
	        this._aContentRatings = source["_aContentRatings"];
	        this._sInitialVisibility = source["_sInitialVisibility"];
	        this._sDownloadUrl = source["_sDownloadUrl"];
	        this._nDownloadCount = source["_nDownloadCount"];
	        this._aFiles = this.convertValues(source["_aFiles"], AFile);
	        this._nSubscriberCount = source["_nSubscriberCount"];
	        this._aContributingStudios = source["_aContributingStudios"];
	        this._sLicense = source["_sLicense"];
	        this._bGenerateTableOfContents = source["_bGenerateTableOfContents"];
	        this._sText = source["_sText"];
	        this._bIsObsolete = source["_bIsObsolete"];
	        this._nLikeCount = source["_nLikeCount"];
	        this._nViewCount = source["_nViewCount"];
	        this._sVersion = source["_sVersion"];
	        this._bAcceptsDonations = source["_bAcceptsDonations"];
	        this._bShowRipePromo = source["_bShowRipePromo"];
	        this._aSubmitter = this.convertValues(source["_aSubmitter"], ASubmitter);
	        this._aGame = this.convertValues(source["_aGame"], AGame);
	        this._aCategory = this.convertValues(source["_aCategory"], Category);
	        this._aSuperCategory = this.convertValues(source["_aSuperCategory"], Category);
	        this._idAccessorSubscriptionRow = source["_idAccessorSubscriptionRow"];
	        this._bAccessorIsSubscribed = source["_bAccessorIsSubscribed"];
	        this._bAccessorHasThanked = source["_bAccessorHasThanked"];
	        this._bAccessorHasUnliked = source["_bAccessorHasUnliked"];
	        this._bAccessorHasLiked = source["_bAccessorHasLiked"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}

export namespace core {
	
	export class KeyBind {
	    name: string;
	    key: string;
	
	    static createFrom(source: any = {}) {
	        return new KeyBind(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.key = source["key"];
	    }
	}

}

export namespace types {
	
	export class Character {
	    id: number;
	    game: number;
	    name: string;
	    avatarUrl: string;
	    element: string;
	
	    static createFrom(source: any = {}) {
	        return new Character(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.game = source["game"];
	        this.name = source["name"];
	        this.avatarUrl = source["avatarUrl"];
	        this.element = source["element"];
	    }
	}
	export class Tag {
	    modId: number;
	    name: string;
	
	    static createFrom(source: any = {}) {
	        return new Tag(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.modId = source["modId"];
	        this.name = source["name"];
	    }
	}
	export class Mod {
	    filename: string;
	    game: number;
	    character: string;
	    characterId: number;
	    enabled: boolean;
	    previewImages: string[];
	    gbId: number;
	    modLink: string;
	    gbFileName: string;
	    gbDownloadLink: string;
	    id: number;
	
	    static createFrom(source: any = {}) {
	        return new Mod(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.filename = source["filename"];
	        this.game = source["game"];
	        this.character = source["character"];
	        this.characterId = source["characterId"];
	        this.enabled = source["enabled"];
	        this.previewImages = source["previewImages"];
	        this.gbId = source["gbId"];
	        this.modLink = source["modLink"];
	        this.gbFileName = source["gbFileName"];
	        this.gbDownloadLink = source["gbDownloadLink"];
	        this.id = source["id"];
	    }
	}
	export class ModWithTags {
	    mod: Mod;
	    tags: Tag[];
	
	    static createFrom(source: any = {}) {
	        return new ModWithTags(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.mod = this.convertValues(source["mod"], Mod);
	        this.tags = this.convertValues(source["tags"], Tag);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class CharacterWithModsAndTags {
	    characters: Character;
	    modWithTags: ModWithTags[];
	
	    static createFrom(source: any = {}) {
	        return new CharacterWithModsAndTags(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.characters = this.convertValues(source["characters"], Character);
	        this.modWithTags = this.convertValues(source["modWithTags"], ModWithTags);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class FileInfo {
	    file: string;
	    bytes: number;
	
	    static createFrom(source: any = {}) {
	        return new FileInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.file = source["file"];
	        this.bytes = source["bytes"];
	    }
	}
	export class DownloadStats {
	    data: FileInfo[][];
	    totalBytes: number;
	
	    static createFrom(source: any = {}) {
	        return new DownloadStats(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.data = this.convertValues(source["data"], FileInfo);
	        this.totalBytes = source["totalBytes"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	
	
	export class Playlist {
	    id: number;
	    name: string;
	    game: number;
	
	    static createFrom(source: any = {}) {
	        return new Playlist(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.game = source["game"];
	    }
	}
	export class PlaylistWithModsAndTags {
	    playlist: Playlist;
	    modsWithTags: ModWithTags[];
	
	    static createFrom(source: any = {}) {
	        return new PlaylistWithModsAndTags(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.playlist = this.convertValues(source["playlist"], Playlist);
	        this.modsWithTags = this.convertValues(source["modsWithTags"], ModWithTags);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}

