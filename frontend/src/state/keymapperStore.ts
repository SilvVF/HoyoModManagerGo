import * as KeyMapper from "wailsjs/go/core/KeyMapper";
import { core } from "wailsjs/go/models";
import { create } from "zustand";

export interface KeymapperState {
  keymappings: core.KeyBind[];
  backups: string[];
  load: (modId: number) => Promise<void>;
  unload: () => void;
  write: (section: string, key: string) => Promise<void>;
}

export const useKeyMapperStore = create<KeymapperState>((set) => ({
  keymappings: [],
  backups: [],
  load: async (modId) => {
    return KeyMapper.Load(modId).then(async () => {
      const backups = await KeyMapper.GetBackups();
      const mappings = await KeyMapper.GetKeyMap();
      set({
        keymappings: mappings,
        backups: backups,
      });
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
}));
