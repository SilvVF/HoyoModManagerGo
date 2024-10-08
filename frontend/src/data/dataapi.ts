import { types } from '../../wailsjs/go/models'
import * as GApi from '../../wailsjs/go/api/GenshinApi'
import * as SRApi from '../../wailsjs/go/api/StarRailApi'
import * as WuWaApi from '../../wailsjs/go/api/WutheringWavesApi'
import * as ZZZApi from '../../wailsjs/go/api/ZenlessZoneZeroApi'
import * as DbHelper from '../../wailsjs/go/core/DbHelper'

export interface DataApi {
    game(): Promise<number>
    skinId(): Promise<number>
    characters(): Promise<types.Character[]>,
    charactersWithModsAndTags(): Promise<types.CharacterWithModsAndTags[]>,
    elements(): Promise<string[]>
}

export const GenshinApi: DataApi = { 
    game: GApi.GetGame,
    skinId: GApi.SkinId,
    characters: async () => DbHelper.SelectCharactersByGame(await GApi.GetGame()),
    charactersWithModsAndTags: async () => DbHelper.SelectCharacterWithModsAndTags(await GApi.GetGame(), "", "", ""),
    elements: GApi.Elements
}

export const StarRailApi: DataApi = {
    game: SRApi.GetGame,
    skinId: SRApi.SkinId,
    characters: async () => DbHelper.SelectCharactersByGame(await SRApi.GetGame()),
    charactersWithModsAndTags: async () => DbHelper.SelectCharacterWithModsAndTags(await SRApi.GetGame(), "", "", ""),
    elements: SRApi.Elements
}

export const ZenlessApi: DataApi = {
    game: ZZZApi.GetGame,
    skinId: ZZZApi.SkinId,
    characters: async () => DbHelper.SelectCharactersByGame(await ZZZApi.GetGame()),
    charactersWithModsAndTags: async () => DbHelper.SelectCharacterWithModsAndTags(await ZZZApi.GetGame(), "", "", ""),
    elements: ZZZApi.Elements
}

export const WutheringWavesApi: DataApi = {
    game: WuWaApi.GetGame,
    skinId: WuWaApi.SkinId,
    characters: async () => DbHelper.SelectCharactersByGame(await WuWaApi.GetGame()),
    charactersWithModsAndTags: async () => DbHelper.SelectCharacterWithModsAndTags(await WuWaApi.GetGame(), "", "", ""),
    elements: WuWaApi.Elements
}