import { Dispatch, SetStateAction, useEffect, useState } from "react";
import * as DarkThemePref from "../../wailsjs/go/core/DarkThemePref"
import * as StartScreenPref from "../../wailsjs/go/core/StartScreenPref"
import * as HonkaiDirPref from "../../wailsjs/go/core/HonkaiDirPref"
import * as GenshinDirPref from "../../wailsjs/go/core/GenshinDirPref"
import * as ZZZDirPref from "../../wailsjs/go/core/ZZZDirPref"
import * as WuwaDirPref from "../../wailsjs/go/core/WuwaDirPref"
import * as IgnorePref from "../../wailsjs/go/core/IgnoreDirPref"
import * as SortModPref from "../../wailsjs/go/core/SortModPref"
import * as ModsAvailablePref from "../../wailsjs/go/core/ModsAvailablePref"
import * as GenshinElementPref from "../../wailsjs/go/core/GenshinElementPref"
import * as HonkaiElementPref from "../../wailsjs/go/core/HonkaiElementPref"
import * as ZenlessElementPref from "../../wailsjs/go/core/ZenlessElementPref"
import * as WuwaElementPref from "../../wailsjs/go/core/WuwaElementPref"
import * as MaxDownloadWorkersPref from "../../wailsjs/go/core/MaxDownloadWorkersPref"
import * as PlaylistGamePref from "../../wailsjs/go/core/PlaylistGamePref"
import * as DiscoverGamePref from "../../wailsjs/go/core/DiscoverGamePref"
import * as ServerPortPref from "../../wailsjs/go/core/ServerPortPref"

export type GoPref<T extends any> = {
    DefaultValue():Promise<T>;
    Delete():Promise<void>;
    Get():Promise<T>;
    IsSet():Promise<boolean>;
    Key():Promise<string>;
    Set(arg1:T):Promise<void>;
}

const darkThemePref = DarkThemePref as GoPref<string>
const startScreenPref = StartScreenPref as GoPref<string>

const serverPortPref = ServerPortPref as GoPref<number>
const honkaiDirPref = HonkaiDirPref as GoPref<string>
const zzzDirPref = ZZZDirPref as GoPref<string>
const genshinDirPref = GenshinDirPref as GoPref<string>
const wuwaDirPref = WuwaDirPref as GoPref<string>
const ignorePref = IgnorePref as GoPref<string[]>
const sortModPref = SortModPref as GoPref<string>

const modsAvailablePref = ModsAvailablePref as GoPref<boolean>
const genshinElementPref = GenshinElementPref as GoPref<string[]>
const honkaiElementPref = HonkaiElementPref as GoPref<string[]>
const zzzElementPref = ZenlessElementPref as GoPref<string[]>
const wuwaElementPref = WuwaElementPref as GoPref<string[]>

const maxDownloadWorkersPref = MaxDownloadWorkersPref as GoPref<number>

const playlistGamePref = PlaylistGamePref as GoPref<number>
const discoverGamePref = DiscoverGamePref as GoPref<string>

export function usePrefrenceAsStateDefault<T extends any>(defaultValue: T, pref: GoPref<T>): [T, Dispatch<SetStateAction<T | undefined>>] {

    const [isSet, setIsSet] = useState(false)
    const [state, setState] = useState<T | undefined>(undefined)

    const refresh = () => {
        pref.Get().then((value) => {
            setState(value)
            setIsSet(true)
        })
    }

    useEffect(() => {
        refresh()
    }, [pref])

    useEffect(() => {
        const s = state
        const set = isSet
        if (s !== undefined) { pref.Set(s) }
        else if (s === undefined && set) {
            setIsSet(false) 
            setState(undefined)
            pref.Delete().then(refresh) 
        }
    }, [state])

    return [state ?? defaultValue, setState]
}

export function usePrefrenceAsState<T extends any>(pref: GoPref<T>): [T | undefined, Dispatch<SetStateAction<T | undefined>>] {

    const [isSet, setIsSet] = useState(false)
    const [state, setState] = useState<T | undefined>(undefined)

    const refresh = () => {
        pref.Get().then((value) => {
            setState(value)
            setIsSet(true)
        })
    }

    useEffect(() => {
        refresh()
    }, [pref])

    useEffect(() => {
        const s = state
        const set = isSet
        if (s !== undefined) { pref.Set(s) }
        else if (s === undefined && set) {
            setIsSet(false) 
            setState(undefined)
            pref.Delete().then(refresh) 
        }
    }, [state])

    return [state, setState]
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
    serverPortPref
}
