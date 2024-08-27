export namespace api {
	
	export class CategoryListResponseItem {
	    _idRow: number;
	    _nCategoryCount: number;
	    _nItemCount: number;
	    _sName: string;
	    _sUrl: string;
	
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
	    _idRow: number;
	    _sModelName: string;
	    _sSingularTitle: string;
	    _sIconClasses: string;
	    _sName: string;
	    _sProfileUrl: string;
	    _tsDateAdded: number;
	    _tsDateModified: number;
	    _bHasFiles: boolean;
	    _aTags: string[];
	    // Go type: struct { AImages []struct { SType string "json:\"_sType\""; SBaseURL string "json:\"_sBaseUrl\""; SFile string "json:\"_sFile,omitempty\""; SFile220 string "json:\"_sFile220,omitempty\""; HFile220 int "json:\"_hFile220,omitempty\""; WFile220 int "json:\"_wFile220,omitempty\""; SFile530 string "json:\"_sFile530,omitempty\""; HFile530 int "json:\"_hFile530,omitempty\""; WFile530 int "json:\"_wFile530,omitempty\""; SFile100 string "json:\"_sFile100,omitempty\""; HFile100 int "json:\"_hFile100,omitempty\""; WFile100 int "json:\"_wFile100,omitempty\"" } "json:\"_aImages\"" }
	    _aPreviewMedia: any;
	    // Go type: struct { IDRow int "json:\"_idRow\""; SName string "json:\"_sName\""; BIsOnline bool "json:\"_bIsOnline\""; BHasRipe bool "json:\"_bHasRipe\""; SProfileURL string "json:\"_sProfileUrl\""; SAvatarURL string "json:\"_sAvatarUrl\"" }
	    _aSubmitter?: any;
	    // Go type: struct { IDRow int "json:\"_idRow\""; SName string "json:\"_sName\""; SProfileURL string "json:\"_sProfileUrl\""; SIconURL string "json:\"_sIconUrl\"" }
	    _aGame: any;
	    // Go type: struct { SName string "json:\"_sName\""; SProfileURL string "json:\"_sProfileUrl\""; SIconURL string "json:\"_sIconUrl\"" }
	    _aRootCategory: any;
	    _sVersion: string;
	    _bIsObsolete: boolean;
	    _sInitialVisibility: string;
	    _bHasContentRatings: boolean;
	    _nLikeCount: number;
	    _nPostCount?: number;
	    _bWasFeatured: boolean;
	    _nViewCount: number;
	    _bIsOwnedByAccessor: boolean;
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
	    // Go type: struct { NRecordCount int "json:\"_nRecordCount\""; BIsComplete bool "json:\"_bIsComplete\""; NPerpage int "json:\"_nPerpage\"" }
	    _aMetadata: any;
	    _aRecords: CategoryRecord[];
	
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
	export class CharacterWithModsAndTags {
	    characters: Character;
	    mods: Mod[];
	    tags: Tag[];
	
	    static createFrom(source: any = {}) {
	        return new CharacterWithModsAndTags(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.characters = this.convertValues(source["characters"], Character);
	        this.mods = this.convertValues(source["mods"], Mod);
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
	

}

