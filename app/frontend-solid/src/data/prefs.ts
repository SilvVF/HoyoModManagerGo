import * as DarkThemePref from "../../wailsjs/go/core/DarkThemePref";
import * as StartScreenPref from "../../wailsjs/go/core/StartScreenPref";
import * as HonkaiDirPref from "../../wailsjs/go/core/HonkaiDirPref";
import * as GenshinDirPref from "../../wailsjs/go/core/GenshinDirPref";
import * as ZZZDirPref from "../../wailsjs/go/core/ZZZDirPref";
import * as WuwaDirPref from "../../wailsjs/go/core/WuwaDirPref";
import * as IgnorePref from "../../wailsjs/go/core/IgnoreDirPref";
import * as SortModPref from "../../wailsjs/go/core/SortModPref";
import * as ModsAvailablePref from "../../wailsjs/go/core/ModsAvailablePref";
import * as GenshinElementPref from "../../wailsjs/go/core/GenshinElementPref";
import * as HonkaiElementPref from "../../wailsjs/go/core/HonkaiElementPref";
import * as ZenlessElementPref from "../../wailsjs/go/core/ZenlessElementPref";
import * as WuwaElementPref from "../../wailsjs/go/core/WuwaElementPref";
import * as MaxDownloadWorkersPref from "../../wailsjs/go/core/MaxDownloadWorkersPref";
import * as PlaylistGamePref from "../../wailsjs/go/core/PlaylistGamePref";
import * as DiscoverGamePref from "../../wailsjs/go/core/DiscoverGamePref";
import * as ServerPortPref from "../../wailsjs/go/core/ServerPortPref";
import * as SpaceSaverPref from "../../wailsjs/go/core/SpaceSaverPref";
import * as ServerPasswordPref from "../../wailsjs/go/core/ServerPasswordPref";
import * as ServerUsernamePref from "../../wailsjs/go/core/ServerUsernamePref";
import * as ServerAuthTypePref from "../../wailsjs/go/core/ServerAuthTypePref";
import * as CleanModDirPref from "../../wailsjs/go/core/CleanModExportDirPref";
import * as EnabledPluginsPref from "../../wailsjs/go/core/EnabledPluginsPref";
import * as RootModDirPref from "../../wailsjs/go/core/RootModDirPref";
import * as UseViewTransitionsPref from "../../wailsjs/go/core/UseViewTransitions";
import * as Oneko from "../../wailsjs/go/core/Oneko";

export type GoPref<T extends any> = {
  DefaultValue(): Promise<T>;
  Delete(): Promise<void>;
  Get(): Promise<T>;
  IsSet(): Promise<boolean>;
  Key(): Promise<string>;
  Set(arg1: T): Promise<void>;
};

const darkThemePref = DarkThemePref as GoPref<string>;
const startScreenPref = StartScreenPref as GoPref<string>;

const serverPortPref = ServerPortPref as GoPref<number>;
const honkaiDirPref = HonkaiDirPref as GoPref<string>;
const zzzDirPref = ZZZDirPref as GoPref<string>;
const genshinDirPref = GenshinDirPref as GoPref<string>;
const wuwaDirPref = WuwaDirPref as GoPref<string>;
const ignorePref = IgnorePref as GoPref<string[]>;
const pluginsPref = EnabledPluginsPref as GoPref<string[]>;
const sortModPref = SortModPref as GoPref<string>;

const modsAvailablePref = ModsAvailablePref as GoPref<boolean>;
const genshinElementPref = GenshinElementPref as GoPref<string[]>;
const honkaiElementPref = HonkaiElementPref as GoPref<string[]>;
const zzzElementPref = ZenlessElementPref as GoPref<string[]>;
const wuwaElementPref = WuwaElementPref as GoPref<string[]>;

const maxDownloadWorkersPref = MaxDownloadWorkersPref as GoPref<number>;
const spaceSaverPref = SpaceSaverPref as GoPref<boolean>;

const playlistGamePref = PlaylistGamePref as GoPref<number>;
const discoverGamePref = DiscoverGamePref as GoPref<string>;

const serverUsernamePref = ServerUsernamePref as GoPref<string>;
const serverPasswordPref = ServerPasswordPref as GoPref<string>;
const serverAuthTypePref = ServerAuthTypePref as GoPref<number>;

const cleanModDirPref = CleanModDirPref as GoPref<boolean>;
const rootModDirPref = RootModDirPref as GoPref<string>;

const useViewTransitionsPref = UseViewTransitionsPref as GoPref<boolean>;
const onekoPref = Oneko as GoPref<boolean>;

//const toastLevelPref = ToastLevelPref as GoPref<number>;

//export type GoPref<T extends any> = {
//   DefaultValue(): Promise<T>;
//   Delete(): Promise<void>;
//   Get(): Promise<T>;
//   IsSet(): Promise<boolean>;
//   Key(): Promise<string>;
//   Set(arg1: T): Promise<void>;
// };

export {
  darkThemePref,
  startScreenPref,
  honkaiDirPref,
  zzzDirPref,
  genshinDirPref,
  wuwaDirPref,
  ignorePref,
  sortModPref,
  modsAvailablePref,
  genshinElementPref,
  honkaiElementPref,
  zzzElementPref,
  wuwaElementPref,
  maxDownloadWorkersPref,
  playlistGamePref,
  discoverGamePref,
  serverPortPref,
  spaceSaverPref,
  serverAuthTypePref,
  serverPasswordPref,
  serverUsernamePref,
  cleanModDirPref,
  pluginsPref,
  rootModDirPref,
  useViewTransitionsPref,
  onekoPref,
};
