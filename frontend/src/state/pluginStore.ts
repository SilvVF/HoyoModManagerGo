import { pluginsPref } from "@/data/prefs";
import { GetPlugins } from "wailsjs/go/main/App";
import { LogDebug, LogPrint } from "wailsjs/runtime/runtime";
import { create } from "zustand";

// type Plugin = {
//     path: string
//     flags: number
// }

export interface PluginState {
  pluginFiles: string[];
  enabledFiles: string[];
  init: () => Promise<void>;
  enablePlugin: (path: string) => Promise<void>;
  disablePlugin: (path: string) => Promise<void>;
}

export const usePluginStore = create<PluginState>((set, get) => ({
  pluginFiles: [],
  enabledFiles: [],
  init: async () => {
    GetPlugins()
      .then((paths) => set(({ pluginFiles: paths ?? [] })))
      .catch(() => set(({ pluginFiles: [] })));

    pluginsPref
      .Get()
      .then((enabledFiles) => set(({ enabledFiles: enabledFiles })))
      .catch(() => set(({ enabledFiles: [] })));
  },
  enablePlugin: async (path: string) => {
    const enabled = [...get().enabledFiles.filter((it) => it != path), path]
    pluginsPref.Set(enabled).then(() => {
      set(({
        enabledFiles: enabled,
      }));
    });
  },
  disablePlugin: async (path: string) => {
    const enabled = (await pluginsPref.Get())
    const filtered = enabled.filter((it) => it != path);
    pluginsPref.Set(filtered).then(() => {
      set(({
        enabledFiles: filtered,
      }));
    });
  },
}));
