import * as SyncHelper from '../../wailsjs/go/core/SyncHelper'

export async function syncCharacters() {
    
    await SyncHelper.Sync(0, 0)
}


