import { types } from '../../wailsjs/go/models'
import * as GApi from '../../wailsjs/go/api/genshinApi'
import * as SRApi from '../../wailsjs/go/api/starRailApi'
import * as WuWaApi from '../../wailsjs/go/api/wutheringWavesApi'
import * as ZZZApi from '../../wailsjs/go/api/zenlessZoneZeroApi'
import DB from './database'

export interface DataApi {
    game(): Promise<number>
    skinId(): Promise<number>
    characters(): Promise<types.Character[]>,
    charactersWithModsAndTags(): Promise<types.CharacterWithModsAndTags[]>,
    elements(): Promise<string[]>
}

export const Game = {
    Genshin: 1,
    StarRail: 2,
    ZZZ: 3,
    WuWa: 4
} as const;

// export const LeagueApi: DataApi = {
//     game: LoLApi.GetGame,
//     skinId: LoLApi.SkinId,
//     characters: async () => DbHelper.SelectCharactersByGame(await LoLApi.GetGame()),
//     charactersWithModsAndTags: async () => DbHelper.SelectCharacterWithModsTagsAndTextures(await LoLApi.GetGame(), "", "", ""),
//     elements: LoLApi.Elements
// }

export const NoOpApi: DataApi = {
    game: async () => -1,
    skinId: async () => -1,
    characters: async () => [],
    charactersWithModsAndTags: async () => [],
    elements: async () => []
}

export const GenshinApi: DataApi = {
    game: GApi.GetGame,
    skinId: GApi.SkinId,
    characters: async () => DB.selectCharactersByGame(await GApi.GetGame()),
    charactersWithModsAndTags: async () => DB.selectCharacterWithModsTagsAndTextures(await GApi.GetGame(), "", "", ""),
    elements: GApi.Elements
}

export const StarRailApi: DataApi = {
    game: SRApi.GetGame,
    skinId: SRApi.SkinId,
    characters: async () => DB.selectCharactersByGame(await SRApi.GetGame()),
    charactersWithModsAndTags: async () => DB.selectCharacterWithModsTagsAndTextures(await SRApi.GetGame(), "", "", ""),
    elements: SRApi.Elements
}

export const ZenlessApi: DataApi = {
    game: ZZZApi.GetGame,
    skinId: ZZZApi.SkinId,
    characters: async () => DB.selectCharactersByGame(await ZZZApi.GetGame()),
    charactersWithModsAndTags: async () => DB.selectCharacterWithModsTagsAndTextures(await ZZZApi.GetGame(), "", "", ""),
    elements: ZZZApi.Elements
}

export const WutheringWavesApi: DataApi = {
    game: WuWaApi.GetGame,
    skinId: WuWaApi.SkinId,
    characters: async () => DB.selectCharactersByGame(await WuWaApi.GetGame()),
    charactersWithModsAndTags: async () => DB.selectCharacterWithModsTagsAndTextures(await WuWaApi.GetGame(), "", "", ""),
    elements: WuWaApi.Elements
}