import { types } from 'wailsjs/go/models'
import * as GApi from 'wailsjs/go/api/GenshinApi'
import * as SRApi from 'wailsjs/go/api/StarRailApi'

export interface DataApi {
    skinId(): Promise<number>
    characters(): Promise<types.Character[]>
    elements(): Promise<string[]>
}

const GenshinApi: DataApi = {
    skinId: GApi.SkinId,
    characters: GApi.Characters,
    elements: GApi.Elements
}

const StarRailApi: DataApi = {
    skinId: SRApi.SkinId,
    characters: SRApi.Characters,
    elements: SRApi.Elements
}

export default { GenshinApi, StarRailApi }