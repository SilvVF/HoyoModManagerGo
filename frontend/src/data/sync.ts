import * as SyncHelper from '../../wailsjs/go/core/SyncHelper'
import { DataApi } from './dataapi'

export async function syncCharacters(dataApi: DataApi, type: number) {
    SyncHelper.Sync(await dataApi.game(), type)
}


