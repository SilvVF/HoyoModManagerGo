import { useState } from 'react';
import * as SyncHelper from '../../wailsjs/go/core/SyncHelper'
import { DataApi } from './dataapi'

export const enum SyncType {
    StartupRequest = 0,
    SyncRequestLocal = 1,
    SyncRequestForceNetwork = 2
}

export async function syncCharacters(dataApi: DataApi, type: SyncType) {
    SyncHelper.Sync(await dataApi.game(), type)
}

export const useSync = (dataApi: DataApi, onComplete: () => void) => {
    const [syncing, setSyncing] = useState(false);


    const sync = (type: SyncType) => {
        setSyncing(true);
        syncCharacters(dataApi, type)
            .then(onComplete)
            .finally(() => setSyncing(false));
    };

    return {
        syncing: syncing,
        sync: sync,
    }
}
