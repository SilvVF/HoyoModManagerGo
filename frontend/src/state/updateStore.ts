import { DownloadModFix, GetUpdates } from "wailsjs/go/main/App"
import { types } from "wailsjs/go/models"
import { create } from "zustand"

interface UpdatesStore {
    loading: boolean,
    error: Error | undefined,
    value: types.Update[]
    inProgress: Set<string>
    started: boolean
    start: () => void
    refresh: () => void
    downloadItem: (update: types.Update) => void
}

export const useUpdatesStore = create<UpdatesStore>((set, get) => ({
    started: false,
    loading: false,
    error: undefined,
    inProgress: new Set(),
    value: [],
    refresh: () => {
        if (get().loading) {
            return
        }
        set({ loading: true })

        GetUpdates().then((updates) => {
            updates.sort((a: types.Update, b: types.Update) => a.game - b.game)
            set({
                value: updates,
                error: undefined
            })
        }).catch((e) => {
            set(({
                error: e
            }))
        })
            .finally(() => {
                set({
                    loading: false
                })
            })
    },
    start: () => {
        if (get().started) {
            return
        }
        set({ started: true })
        get().refresh()
    },
    downloadItem: (update) => {

        if (get().inProgress.has(update.newest.dl)) {
            return
        }

        set((state) => {
            state.inProgress.add(update.newest.dl)
            return {
                inProgress: new Set(state.inProgress)
            }
        })
        DownloadModFix(update.game, update.current, update.newest.fname, update.newest.dl)
            .then(() => get().refresh())
            .finally(() => {
                set((state) => {
                    state.inProgress.delete(update.newest.dl)
                    return {
                        inProgress: new Set(state.inProgress)
                    }
                })
            })
    }
}))
