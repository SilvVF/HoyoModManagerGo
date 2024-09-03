import { Dispatch, SetStateAction, useEffect, useState } from "react";
import * as DarkThemePref from "../../wailsjs/go/core/DarkThemePref"
import * as StartScreenPref from "../../wailsjs/go/core/StartScreenPref"
import * as HonkaiDirPref from "../../wailsjs/go/core/HonkaiDirPref"
import * as GenshinDirPref from "../../wailsjs/go/core/GenshinDirPref"
import * as ZZZDirPref from "../../wailsjs/go/core/ZZZDirPref"
import * as WuwaDirPref from "../../wailsjs/go/core/WuwaDirPref"
import * as IgnorePref from "../../wailsjs/go/core/IgnoreDirPref"

type GoPref<T extends any> = {
    DefaultValue():Promise<T>;
    Delete():Promise<void>;
    Get():Promise<T>;
    IsSet():Promise<boolean>;
    Key():Promise<string>;
    Set(arg1:T):Promise<void>;
}

const darkThemePref = DarkThemePref as GoPref<string>
const startScreenPref = StartScreenPref as GoPref<string>

const honkaiDirPref = HonkaiDirPref as GoPref<string>
const zzzDirPref = ZZZDirPref as GoPref<string>
const genshinDirPref = GenshinDirPref as GoPref<string>
const wuwaDirPref = WuwaDirPref as GoPref<string>
const ignorePref = IgnorePref as GoPref<string[]>


export function usePrefrenceAsState<T extends any>(pref: GoPref<T>): [T | undefined, Dispatch<SetStateAction<T | undefined>>] {

    const [state, setState] = useState<T | undefined>(undefined)

    useEffect(() => {
        pref.Get().then((value) => setState(value))
    }, [pref])

    useEffect(() => {
        if (state !== undefined) { pref.Set(state) }
    }, [state])

    return [state, setState]
}

export { darkThemePref , startScreenPref, honkaiDirPref, zzzDirPref, genshinDirPref, wuwaDirPref, ignorePref }
