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

export const useDownloadStore = create<DownloadState>((set) => ({
  downloads: {},
  running: 0,
  expanded: false,
  cancel: undefined,
  updateQueue: async () => {
    Downloader.GetQueue().then((q) => {
      set(() => ({
        downloads: q
      }))
    })
  },
  subscribe: () => {
    const cancel = EventsOn(
      'download',
      (data) => {
        LogPrint("download event" + data)
        const event = (data as State);
        if (event === "queued") {
          set((state) => ({ running: state.running + 1, expanded: true }))
        } else {
          set((state) => ({ running: Math.max(0, state.running - 1) }))
        }
      })
    return cancel
  },
  retry: async (key: string) => {
    Downloader.Retry(key).catch((e) => LogDebug(e))
  },
  toggleExpanded: () => set((state) => ({ expanded: !state.expanded })),
  remove: async (key: string) => {
    await Downloader.RemoveFromQueue(key)
    Downloader.GetQueue().then((q) => {
      set(() => (
        {
          downloads: q,
        }
      ))
    })
  }
}))