import { pluginsPref } from "@/data/prefs";
import { CancelFn } from "@/lib/tsutils";
import { GetPlugins } from "wailsjs/go/main/App";
import { EventsOn, LogDebug } from "wailsjs/runtime/runtime";
import { create } from "zustand";

// type Plugin = {
//     path: string
//     flags: number
// }

export interface PluginState {
  pluginFiles: string[];
  enabledFiles: string[];
  listen: () => CancelFn
  init: () => Promise<void>;
  enablePlugin: (path: string) => Promise<void>;
  disablePlugin: (path: string) => Promise<void>;
}

type PEvent = "plugins_started" | "plugins_stopped" | "plugin_error" | "plugin_info" | "plugin_stopped"

type PluginEvent = {
  event: PEvent
  data: any
}

function subscribeToPluginUpdates(): () => void {

  const cancel = EventsOn("plugins_event", (data) => {
      let pluginEvent: PluginEvent
      try {
        pluginEvent = data as PluginEvent
      } catch {
        return
      }

      LogDebug(pluginEvent.data.toString())
  })

  return cancel
}

export const usePluginStore = create<PluginState>((set, get) => ({
  pluginFiles: [],
  enabledFiles: [],
  listen: subscribeToPluginUpdates,
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
