import { Dispatch, SetStateAction, useEffect, useState } from "react";
import * as DarkThemePref from "../../wailsjs/go/core/DarkThemePref"
import * as StartScreenPref from "../../wailsjs/go/core/StartScreenPref"

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

export { darkThemePref , startScreenPref }
