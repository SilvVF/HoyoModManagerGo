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
import { EventsEmit, EventsOn, LogDebug } from "wailsjs/runtime/runtime";
import { useStateProducer } from "@/lib/utils";
import { Dispatch, useCallback } from "react";

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

const memPref = new Map<string, any>();

export function inMemroyPerf<T extends any>(value: T, key: string): GoPref<T> {
  let isSet = false;
  return {
    DefaultValue: async () => value,
    Delete: async () => {
      memPref.delete(key);
    },
    Get: async () => {
      LogDebug("setting " + value);
      if (memPref.has(key)) return memPref.get(key);
      else return value;
    },
    IsSet: async () => isSet,
    Key: async () => "",
    Set: async (v) => {
      isSet = true;
      memPref.set(key, v);
    },
  } as GoPref<T>;
}

const CHANGE_EVENT = "PREFERENCE_CHANGED";

function usePrefrenceAsState2Base<T>(
  defaultValue: T,
  pref: GoPref<T>,
  canBeUndefined: boolean,
): [T, Dispatch<React.SetStateAction<T>>] {
  const value = useStateProducer(defaultValue, async (update, onDispose) => {
    const event = CHANGE_EVENT + (await pref.Key());

    pref.Get().then(update);

    const cancel = EventsOn(event, async (data) => {
      try {
        if (!canBeUndefined && data === undefined) {
          update(defaultValue);
        } else {
          update(data);
        }
      } catch {}
    });

    onDispose(() => {
      cancel();
    });
  });

  const updateFn = useCallback(
    (action: React.SetStateAction<T>) => {
      let newVal: T | undefined;
      if (isFunction(action)) {
        newVal = action(value);
      } else {
        newVal = action;
      }

      pref.Key().then((key) => {
        if (newVal === undefined) {
          pref.Delete().then(() => EventsEmit(CHANGE_EVENT + key, undefined));
        } else {
          pref.Set(newVal).then(() => EventsEmit(CHANGE_EVENT + key, newVal));
        }
      });
    },
    [value],
  );

  return [value, updateFn] as const;
}

function isFunction<T>(
  action: React.SetStateAction<T>,
): action is (prevState: T) => T {
  return typeof action === "function";
}

export function usePrefrenceAsStateDefault<T extends any>(
  defaultValue: Exclude<T, undefined>,
  pref: GoPref<T>,
) {
  return usePrefrenceAsState2Base(defaultValue, pref, false);
}

export function usePrefrenceAsState<T extends any>(pref: GoPref<T>) {
  return usePrefrenceAsState2Base(undefined, pref, true);
}

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
