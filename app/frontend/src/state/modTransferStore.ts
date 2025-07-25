// TODO: implement store and show dialog over app while transfering
// see if this is even need to be shown over app or can be done in the background

import { rootModDirPref } from "@/data/prefs";
import { queryClient } from "@/data/queryClient";
import { CancelFn } from "@/lib/tsutils";
import { ChangeRootModDir, RemoveOldModDir } from "wailsjs/go/main/App";
import { EventsOn, LogDebug } from "wailsjs/runtime/runtime";
import { create } from "zustand";

const CHANGE_EVENT = "change_dir";
type E_TYPE = "progress" | "error" | "finished";

export type TransferState =
  | "idle"
  | "confirm"
  | "loading"
  | "error"
  | "success"
  | "delete";

export type TransferProgress = {
  total: number;
  progress: number;
};

export interface ModTransferStore {
  state: TransferState;
  error: string | undefined;
  prevDir: string | undefined;
  pendingDelete: string | undefined;
  newDir: string | undefined;
  deleting: boolean;
  progress: TransferProgress;
  start: (dest: string) => void;
  listen: () => CancelFn;
  clearOldDir: () => void;
  confirm: (shouldTransfer: boolean) => void;
  resetStore: () => void;
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
    const pendingDelete = get().pendingDelete;
    if (get().deleting || !pendingDelete) {
      return;
    }
    set({
      deleting: true,
    });
    RemoveOldModDir(pendingDelete)
      .then(() => {
        set({
          state: "delete",
          pendingDelete: undefined,
          deleting: false,
        });
      })
      .catch(() => {
        set({
          state: "delete",
          deleting: false,
        });
      });
  },
  resetStore: () => {
    set({
      state: "idle",
      error: undefined,
      pendingDelete: undefined,
      prevDir: undefined,
      newDir: undefined,
      deleting: false,
      progress: { progress: 0, total: 0 },
    });
  },
  confirm: (shouldTransfer: boolean) => {
    const newDir = get().newDir;
    const prevDir = get().prevDir;

    if (!newDir) {
      LogDebug("newDir was undefined");
      return;
    }

    // dest, copyOver
    set({
      state: "loading",
    });
    ChangeRootModDir(newDir, shouldTransfer)
      .then(() => {
        set((s) => ({
          state: s.state === "error" ? "error" : "success",
          pendingDelete: prevDir,
          newDir: undefined,
          prevDir: newDir,
        }));
      })
      .catch((e) => {
        set({
          state: "error",
          error: e.toString(),
          pendingDelete: undefined,
          newDir: newDir,
          prevDir: prevDir,
        });
      })
      .finally(async () => {
        queryClient.invalidateQueries({
          queryKey: [await rootModDirPref.Key()],
        });
      });
  },
  start: (dest: string) => {
    rootModDirPref.Get().then((dir) => {
      set({
        prevDir: dir,
        newDir: dest,
        pendingDelete: undefined,
        state: "confirm",
      });
    });
  },
  listen: () => {
    rootModDirPref
      .Get()
      .then((dir) => {
        set({
          prevDir: dir,
        });
      })
      .catch();

    return EventsOn(
      CHANGE_EVENT,
      (type: E_TYPE, data: TransferProgress | string | undefined) => {
        try {
          if (type === "progress") {
            set({
              progress: data as TransferProgress,
            });
          }
        } catch (e) {
          LogDebug(String(e));
        }
      },
    );
  },
}));
