import * as KeyMapper from "wailsjs/go/core/KeyMapper";
import { core } from "wailsjs/go/models";
import { create } from "zustand";

export interface KeymapperState {
  keymappings: core.KeyBind[];
  backups: string[];
  load: (modId: number) => Promise<void>;
  unload: () => void;
  write: (section: string, key: string) => Promise<void>;
  save: () => Promise<void>;
}

export const useKeyMapperStore = create<KeymapperState>((set) => ({
  keymappings: [],
  backups: [],
  load: async (modId) => {
    return KeyMapper.Load(modId).then(() => {
      KeyMapper.GetKeymaps().then((keymaps) => set({backups: keymaps}));
      KeyMapper.GetKeyMap().then((keymap) => set({keymappings: keymap}));
    });
  },
  unload: async () => {
    KeyMapper.Unload().then(() => {
      set({
        keymappings: [],
        backups: [],
      });
    });
  },
  write: async (section: string, key: string) => {
    return KeyMapper.Write(section, key).then(() => {
        KeyMapper.GetKeyMap().then((mappings) => {
            set({
                keymappings: mappings
            })
        })
    });
  },
  save: async () => KeyMapper.SaveConfig().then(async () => {
    KeyMapper.GetKeymaps().then((keymaps) => set({backups: keymaps}));
    KeyMapper.GetKeyMap().then((keymap) => set({keymappings: keymap}));
  })
}));
