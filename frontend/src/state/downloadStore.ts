import { EventsOn, LogDebug, LogPrint } from "../../wailsjs/runtime/runtime";
import * as Downloader from "../../wailsjs/go/core/Downloader";
import { create } from "zustand";
import { CancelFn } from "@/lib/tsutils";
export type DownloadProgress = {
  total: number;
  progress: number;
};

export type State = "download" | "queued" | "finished" | "unzip" | "error" | "compress"

export type Download = {
  filename: string;
  link: string;
  state: State;
  unzip: DownloadProgress;
  fetch: DownloadProgress;
  compress: DownloadProgress;
};

export type DownloadState = {
  downloads: {
    [link: string]: Download
  },
  running: number,
  expanded: boolean,
  remove: (key: string) => void,
  subscribe: () => CancelFn,
  updateQueue: () => Promise<void>,
  retry: (key: string) => Promise<void>,
  toggleExpanded: () => void,
}

const runningCount = (q: Record<string, Download>) => Object.values<Download>(q).filter((item) => item.state !== "finished" && item.state !== "error").length

export const dlStates: State[] = ["download", "queued", "unzip", "compress"];

export const useDownloadStore = create<DownloadState>((set, get) => ({
  downloads: {},
  running: 0,
  expanded: false,
  cancel: undefined,
  updateQueue: async () => {
    Downloader.GetQueue().then((q) => {
      set({
        downloads: q,
        running: runningCount(q)
      })
    })
  },
  subscribe: () => {
    get().updateQueue()
    const cancel = EventsOn(
      'download',
      (data) => {
        LogPrint("download event" + data)
        const event = (data as State);
        if (event === "queued") {
          set({ expanded: true })
        }
        get().updateQueue()
      })
    return cancel
  },
  retry: async (key: string) => {
    await Downloader.Retry(key).catch((e) => LogDebug(e))
    get().updateQueue()
  },
  toggleExpanded: () => set((state) => ({ expanded: !state.expanded })),
  remove: async (key: string) => {
    await Downloader.RemoveFromQueue(key)
    get().updateQueue()
  }
}))