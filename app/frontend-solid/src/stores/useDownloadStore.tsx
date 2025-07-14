import { createContext, onCleanup, ParentProps, useContext } from "solid-js";
import { createStore, reconcile } from "solid-js/store";
import { EventsOn } from "wailsjs/runtime/runtime";
import * as Downloader from "wailsjs/go/core/Downloader";

const DownloadContext = createContext<DownloadState>();

export type CancelFn = () => void;

export type DownloadProgress = {
  total: number;
  progress: number;
};

export type State =
  | "download"
  | "queued"
  | "finished"
  | "unzip"
  | "error"
  | "compress";

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
    [link: string]: Download;
  };
  running: number;
  expanded: boolean;
  events: {
    remove: (key: string) => void;
    retry: (key: string) => void;
    toggleExpanded: () => void;
    clearDone: () => void;
    clear: (key: string) => void;
    retryAll: () => void;
  };
};

export const DownloadSortPriority: Record<State, number> = {
  error: 0,
  download: 1,
  unzip: 2,
  compress: 3,
  finished: 4,
  queued: 5,
};

export const useDownloadStore = () => useContext(DownloadContext)!;

const dlStates: State[] = ["download", "queued", "unzip", "compress"];

export function checkDownloadError(download: Download): boolean {
  return download.state === "error";
}

export function checkDownloadOk(download: Download): boolean {
  return download.state === "error" || download.state === "finished";
}

export function checkDownloadComplete(download: Download): boolean {
  return download.state === "error" || download.state === "finished";
}

export const DownloadProvider = (props: ParentProps) => {
  const [store, setStore] = createStore<DownloadState>({
    downloads: {},
    running: 0,
    expanded: false,
    events: {
      clear(key: string) {
        Downloader.RemoveFromQueue(key).then(() => {
          Downloader.GetQueue().then((queue) => {
            setStore("downloads", reconcile(queue));
          });
        });
      },
      async clearDone() {
        for (const done of Object.values(store.downloads).filter(
          (d) => d.state === "finished" || d.state === "error"
        )) {
          await Downloader.RemoveFromQueue(done.link);
        }
        Downloader.GetQueue().then((queue) => {
          setStore("downloads", reconcile(queue));
        });
      },
      remove(key: string) {
        Downloader.RemoveFromQueue(key).then(() => {
          Downloader.GetQueue().then((queue) => {
            setStore("downloads", reconcile(queue));
          });
        });
      },
      retryAll() {
        for (const dl of Object.values(store.downloads)) {
          if (dl.state === "finished" || dl.state === "error") {
            Downloader.Retry(dl.link);
          }
        }
      },
      retry(key: string) {
        Downloader.Retry(key);
      },
      toggleExpanded() {
        setStore("expanded", !store.expanded);
      },
    },
  });

  const cancel = EventsOn("download", async (data) => {
    const event = data as State;
    if (event === "queued") {
      setStore("expanded", true);
    }

    const queue = await Downloader.GetQueue();
    setStore("downloads", reconcile(queue));
  });

  onCleanup(() => {
    cancel();
  });

  return (
    <DownloadContext.Provider value={store}>
      {props.children}
    </DownloadContext.Provider>
  );
};
