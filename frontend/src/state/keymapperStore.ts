import * as KeyMapper from "wailsjs/go/core/KeyMapper";
import { core } from "wailsjs/go/models";
import { LogDebug } from "wailsjs/runtime/runtime";
import { create } from "zustand";

export interface KeymapperState {
  keymappings: core.KeyBind[];
  backups: string[];
  load: (modId: number) => Promise<void>;
  loadPrevious: (modId: number, file: string) => Promise<void>;
  unload: () => void;
  deleteKeymap: (file: string) => Promise<void>;
  write: (section: string, sectionKey: string,  keys: string[]) => Promise<void>;
  save: (modId: number, name: string) => Promise<void>;
}

export const useKeyMapperStore = create<KeymapperState>((set, get) => ({
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
  deleteKeymap: async (file: string) => {
    KeyMapper.DeleteKeymap(file).then(() => {
      KeyMapper.GetKeymaps().then((keymaps) => set({backups: keymaps}));
    })
  },
  loadPrevious: async (modId: number, file: string) => {
    KeyMapper.LoadPrevious(file).then(() => { get().load(modId) })
  },
  write: async (section: string, sectionKey: string, keys: string[]) => {
    LogDebug(`section: ${section}, sectionKey: ${sectionKey}, keys: ${keys}`)
    return KeyMapper.Write(section, sectionKey,  keys).then(() => {
        KeyMapper.GetKeyMap().then((mappings) => {
            set({
                keymappings: mappings
            })
        })
    });
  },
  save: async ( modId: number, name: string) => KeyMapper.SaveConfig(name).then(() => get().load(modId))
}));


export const virtualKeyCodeMap = {
  // Alphanumeric keys
  48: 0x30, // 0
  49: 0x31, // 1
  50: 0x32, // 2
  51: 0x33, // 3
  52: 0x34, // 4
  53: 0x35, // 5
  54: 0x36, // 6
  55: 0x37, // 7
  56: 0x38, // 8
  57: 0x39, // 9
  65: 0x41, // A
  66: 0x42, // B
  67: 0x43, // C
  68: 0x44, // D
  69: 0x45, // E
  70: 0x46, // F
  71: 0x47, // G
  72: 0x48, // H
  73: 0x49, // I
  74: 0x4A, // J
  75: 0x4B, // K
  76: 0x4C, // L
  77: 0x4D, // M
  78: 0x4E, // N
  79: 0x4F, // O
  80: 0x50, // P
  81: 0x51, // Q
  82: 0x52, // R
  83: 0x53, // S
  84: 0x54, // T
  85: 0x55, // U
  86: 0x56, // V
  87: 0x57, // W
  88: 0x58, // X
  89: 0x59, // Y
  90: 0x5A, // Z

  // Function keys
  112: 0x7B, // F1
  113: 0x7C, // F2
  114: 0x7D, // F3
  115: 0x7E, // F4
  116: 0x7F, // F5
  117: 0x80, // F6
  118: 0x81, // F7
  119: 0x82, // F8
  120: 0x83, // F9
  121: 0x84, // F10
  122: 0x85, // F11
  123: 0x86, // F12

  // Arrow keys
  37: 0x25, // Arrow Left
  38: 0x26, // Arrow Up
  39: 0x27, // Arrow Right
  40: 0x28, // Arrow Down

  // Special keys
  8: 0x08,   // Backspace
  9: 0x09,   // Tab
  13: 0x0D,  // Enter
  16: 0x10,  // Shift
  17: 0x11,  // Control
  18: 0x12,  // Alt
  20: 0x14,  // Caps Lock
  27: 0x1B,  // Escape
  32: 0x20,  // Spacebar
  33: 0x22,  // Page Up
  34: 0x22,  // Page Down
  35: 0x23,  // End
  36: 0x24,  // Home
  45: 0x2D,  // Insert
  46: 0x2E,  // Delete
  144: 0x90, // Num Lock

  // Numpad keys
  96: 0x60, // Numpad 0
  97: 0x61, // Numpad 1
  98: 0x62, // Numpad 2
  99: 0x63, // Numpad 3
  100: 0x64, // Numpad 4
  101: 0x65, // Numpad 5
  102: 0x66, // Numpad 6
  103: 0x67, // Numpad 7
  104: 0x68, // Numpad 8
  105: 0x69, // Numpad 9
  106: 0x6A, // Numpad *
  107: 0x6B, // Numpad +
  109: 0x6D, // Numpad -
  110: 0x6E, // Numpad .
  111: 0x6F, // Numpad /
};