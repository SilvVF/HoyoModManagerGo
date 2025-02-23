// TODO: implement store and show dialog over app while transfering
// see if this is even need to be shown over app or can be done in the background

import { rootModDirPref } from "@/data/prefs";
import { CancelFn } from "@/lib/tsutils";
import { ChangeRootModDir, RemoveAll } from "wailsjs/go/main/App";
import { EventsOn, LogDebug } from "wailsjs/runtime/runtime";
import { create } from "zustand";

const CHANGE_EVENT = "change_dir"
type E_TYPE = "progress" | "error" | "finished"


type Event = {
    type: E_TYPE
    data: any
}

export type TransferState = "idle" | "confirm" | "loading" | "error" | "success" | "delete"

export type TransferProgress = {
    total: number
    progress: number
}

export interface ModTransferStore {
    state: TransferState,
    error: string | undefined,
    prevDir: string | undefined,
    pendingDelete: string | undefined,
    newDir: string | undefined,
    deleting: boolean,
    progress: TransferProgress,
    start: (dest: string) => void,
    listen: () => CancelFn,
    clearOldDir: () => void,
    confirm: (shouldTransfer: boolean) => void
}

export const useModTransferStore = create<ModTransferStore>((set, get) => ({
    state: "idle",
    error: undefined,
    pendingDelete: undefined,
    prevDir: undefined,
    newDir: undefined,
    deleting: false,
    progress: { progress: 0, total: 0 },
    clearOldDir: () => {
        const pendingDelete = get().pendingDelete
        if (get().deleting || !pendingDelete) {
            return
        }
        set({
            deleting: true
        })
        RemoveAll(pendingDelete).then(() => {
            set({
                state: "delete",
                pendingDelete: undefined,
                deleting: false
            })
        })
            .catch(() => {
                set({
                    state: "delete",
                    deleting: false
                })
            })
    },
    confirm: (shouldTransfer: boolean) => {
        const newDir = get().newDir
        const prevDir = get().prevDir

        if (!newDir) {
            LogDebug("newDir was undefined")
            return
        }

        // dest, copyOver
        set({
            state: "loading"
        })
        ChangeRootModDir(newDir, shouldTransfer)
            .then(() => {
                set((s) => ({
                    state: (s.state === "error")
                        ? "error"
                        : "success",
                    pendingDelete: prevDir
                }))
            })
            .catch((e) => {
                set({
                    state: "error",
                    error: e.toString()
                })
            })
    },
    start: (dest: string) => {
        rootModDirPref.Get().then((dir) => {
            set({
                prevDir: dir,
                newDir: dest,
                pendingDelete: undefined,
                state: "confirm"
            })
        })
    },
    listen: () => {
        rootModDirPref.Get().then((dir) => {
            set({
                prevDir: dir
            })
        })
            .catch()

        return EventsOn(CHANGE_EVENT, (data: Event) => {
            try {
                switch (data.type) {
                    case "progress":
                        const prog = data.data as TransferProgress
                        set({
                            state: "loading",
                            progress: prog
                        })
                        break
                    case "finished":
                        set((state) => ({
                            state: "success",
                            prevDir: state.newDir,
                            newDir: undefined
                        }))
                        break
                    case "error":
                        set({
                            state: "error",
                            error: (data.data.toString()),
                            newDir: undefined
                        })
                        break
                }
            } catch (e) {
                LogDebug(String(e))
            }
        })
    }
}))
