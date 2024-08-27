import { types } from '../../wailsjs/go/models'
import * as GApi from '../../wailsjs/go/api/GenshinApi'
import * as SRApi from '../../wailsjs/go/api/StarRailApi'
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