import { Button } from "@/components/ui/button";
import  {genshinDirPref, honkaiDirPref, usePrefrenceAsState, wuwaDirPref, zzzDirPref } from "@/data/prefs";
import { GetExportDirectory } from "../../wailsjs/go/main/App"



export default function SettingsScreen() {
    
    const [honkaiDir, setHonkaiDir] = usePrefrenceAsState(honkaiDirPref)
    const [genshinDir, setGenshinDir] = usePrefrenceAsState(genshinDirPref)
    const [wuwaDir, setWuwaDir] = usePrefrenceAsState(wuwaDirPref)
    const [zzzDir, setZZZdir] = usePrefrenceAsState(zzzDirPref)

    const items =  [
        { 
            name: "Honkai Star Rail",
            value: honkaiDir, 
            setValue: setHonkaiDir 
        },
        { 
            name: "Genshin Impact",
            value: genshinDir, 
            setValue: setGenshinDir 
        },
        { 
            name: "Wuthering Waves",
            value: wuwaDir, 
            setValue: setWuwaDir 
        },
        { 
            name: "Zenless Zone Zero",
            value: zzzDir, 
            setValue: setZZZdir 
        },
    ]

    const openDialogAndSet = async (setDir: (s: string) => void) => {
        GetExportDirectory().then((dir) => setDir(dir))
    } 

    return (
        <div className="mb-2 px-4">
            <h1 className="text-2xl font-bold my-4">Settings</h1>
            <h2 className="text-lg font-semibold tracking-tight">
                Export Locations
            </h2>
        {
          items.map((item) =>  {
            return (
                <SettingsDirItem
                    name={item.name}
                    setDir={() => openDialogAndSet(item.setValue)} 
                    dir={item.value}
                />
            )
          })
        }
        </div>
    )
}


function SettingsDirItem(
   props: {
    name: string,
    setDir: () => void,
    dir: string | undefined
   }
) {
    return (
        <div className="flex flex-row justify-between items-center m-2 rounded-lg hover:bg-primary-foreground">
        <div className="flex flex-col m-2">
            <h2 className="space-y-1 text-primary">{props.name}</h2>
            <div className="text-zinc-500">{props.dir?.ifEmpty(() => "unset")}</div>
        </div>
        <Button size="icon" className="mx-2" onPointerDown={props.setDir}>
        <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px"><path d="M200-200h57l391-391-57-57-391 391v57Zm-80 80v-170l528-527q12-11 26.5-17t30.5-6q16 0 31 6t26 18l55 56q12 11 17.5 26t5.5 30q0 16-5.5 30.5T817-647L290-120H120Zm640-584-56-56 56 56Zm-141 85-28-29 57 57-29-28Z"/></svg>
        </Button>
        </div>
    )
}