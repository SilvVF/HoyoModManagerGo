import { createSignal } from "solid-js";
import * as SyncHelper from "../../wailsjs/go/core/SyncHelper";
import { DataApi } from "./dataapi";

export const enum SyncType {
  StartupRequest = 0,
  SyncRequestLocal = 1,
  SyncRequestForceNetwork = 2,
}

export async function syncCharacters(dataApi: DataApi, type: SyncType) {
  SyncHelper.Sync(await dataApi.game(), type);
}

export const useSync = (dataApi: DataApi) => {
  const [syncing, setSyncing] = createSignal(false);

  const sync = (type: SyncType) => {
    setSyncing(true);
    syncCharacters(dataApi, type).finally(() => setSyncing(false));
  };

  return {
    syncing: syncing,
    sync: sync,
  };
};
