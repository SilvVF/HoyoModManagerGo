import { pluginsPref } from "@/data/prefs";
import { CancelFn } from "@/lib/tsutils";
import { GetPluginsState, StartPlugins } from "wailsjs/go/main/App";
import { EventsOn, LogDebug } from "wailsjs/runtime/runtime";
import { create } from "zustand";

export type LPlugin = {
  path: string;
  lastEvent: number;
  flags: number;
};

export interface PluginState {
  plugins: LPlugin[];
  enabledFiles: string[];
  started: boolean;
  listen: () => CancelFn;
  init: () => Promise<void>;
  enablePlugin: (path: string) => Promise<void>;
  disablePlugin: (path: string) => Promise<void>;
}

type StoreSet = {
  (
    partial:
      | PluginState
      | Partial<PluginState>
      | ((state: PluginState) => PluginState | Partial<PluginState>),
    replace?: false
  ): void;
  (
    state: PluginState | ((state: PluginState) => PluginState),
    replace: true
  ): void;
};

type PEvent =
  | "plugins_started"
  | "plugins_stopped"
  | "plugin_error"
  | "plugin_info"
  | "plugin_stopped";

type PluginEvent = {
  event: PEvent;
  data: any;
};

function subscribeToPluginUpdates(set: StoreSet): () => void {
  const cancel = EventsOn("plugins_event", (data) => {
    let pluginEvent: PluginEvent;
    try {
      pluginEvent = data as PluginEvent;
      if (pluginEvent.event === "plugins_started") {
        setPluginState(set);
      }
    } catch {
      return;
    }

    LogDebug(pluginEvent.data.toString());
  });

  StartPlugins().catch(() => {
      cancel()
  })

  return cancel;
}

function setPluginState(set: StoreSet) {
  GetPluginsState()
    .then((state) => {
      set({
        started: state.Started,
        plugins: state.PluginState.map((ps) => {
          return {
            lastEvent: ps.LastEvent,
            path: ps.Path,
            flags: ps.Flags
          };
        }),
      });
    })
    .catch(() =>
      set({
        started: false,
        plugins: [],
      })
    );
}

export const usePluginStore = create<PluginState>((set, get) => ({
  plugins: [],
  enabledFiles: [],
  started: false,
  listen: () => subscribeToPluginUpdates(set),
  init: async () => {
    setPluginState(set);
    pluginsPref
      .Get()
      .then((enabledFiles) => set({ enabledFiles: enabledFiles }))
      .catch(() => set({ enabledFiles: [] }));
  },
  enablePlugin: async (path: string) => {
    const enabled = [...get().enabledFiles.filter((it) => it != path), path];
    pluginsPref.Set(enabled).then(() => {
      set({
        enabledFiles: enabled,
      });
    });
  },
  disablePlugin: async (path: string) => {
    const enabled = await pluginsPref.Get();
    const filtered = enabled.filter((it) => it != path);
    pluginsPref.Set(filtered).then(() => {
      set({
        enabledFiles: filtered,
      });
    });
  },
}));
