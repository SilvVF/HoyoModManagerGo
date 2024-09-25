import { EventsOn } from "../../wailsjs/runtime/runtime";
import * as Downloader from "../../wailsjs/go/core/Downloader";
import { create } from "zustand";

export type DownloadProgress = {
  total: number;
  progress: number;
};

export type Download = {
  filename: string;
  state: string;
  unzip: DownloadProgress;
  fetch: DownloadProgress;
};

export type DownloadEvent = {
  Filename: string;
  Ptype: string;
  Total: number;
  Progress: number;
};

export type DownloadState = {
    downloads: {
        [filname: string]: Download
    },
    running: number,
    expanded: boolean,
    remove: (key: string) => void,
    subscribe: () => () => void,
    updateQueue: () => Promise<void>,
    toggleExpanded: () => void, 
}

export const useDownloadStore = create<DownloadState>((set) => ({
    downloads: {},
    running: 0,
    expanded: false,
    cancel: undefined,
    updateQueue: async () => {
        Downloader.GetQueue().then((q) => {
          set(() => ({downloads: q}))
        })
    },
    subscribe: () => {
      const cancel = EventsOn(
        'download',
        (data) => {
          const event = data as string;
          if (event === "queued") {
              set((state) => ({running: state.running + 1, expanded: true}))
          } else if (event === "finished") {
            set((state) => ({running: state.running - 1}))
          }
      })
      return cancel
    },
    toggleExpanded: () => set((state) => ({expanded: !state.expanded})),
    remove: (key: string) => {
        set((state) => {
            delete state.downloads[key];
            return ({downloads: state.downloads})
        })
    }
}))