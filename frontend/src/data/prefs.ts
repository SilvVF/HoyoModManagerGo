import { LogPrint } from "../../wailsjs/runtime/runtime"
import * as DarkThemePref from "../../wailsjs/go/core/DarkThemePref"

// type GoPref = {
//     DefaultValue():Promise<boolean>;
//     Delete():Promise<void>;
//     Get():Promise<boolean>;
//     IsSet():Promise<boolean>;
//     Key():Promise<string>;
//     Set(arg1:boolean):Promise<void>;
// }

export const testPref = async () => {
    await DarkThemePref.Set(true)
    const newValue = await DarkThemePref.Get()

    LogPrint(`${newValue}`)
}



