import * as SyncHelper from '../../wailsjs/go/core/SyncHelper'
import { DataApi } from './dataapi'

export async function syncCharacters(dataApi: DataApi) {
    SyncHelper.Sync(await dataApi.game(), 0)
}


