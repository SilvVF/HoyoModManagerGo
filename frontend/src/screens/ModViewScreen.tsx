import { useStateProducer } from "@/lib/utils";
import * as GbApi from "../../wailsjs/go/api/GbApi";
import { api } from "../../wailsjs/go/models";
import { useParams } from "react-router-dom";
import { LogPrint } from "../../wailsjs/runtime/runtime";
import * as Downloader from "../../wailsjs/go/core/Downloader" 


export function ModViewScreen() {
    
    const { id } = useParams()

    const content = useStateProducer<api.ModPageResponse | undefined>(undefined, async (update) => {
        LogPrint(id ?? "undefinded")
        const page = await GbApi.ModPage(Number(id))
        update(page)
    }, [id])

    

    const download = async (link: string, filename: string) => {
        await Downloader.Donwload(link, filename, "C:\\Users\\david\\AppData\\Local\\HoyoModManagerGo\\cache")
    }

    return (
        <div className="flex flex-col min-w-screen max-h-screen">
            {
                content?._aFiles?.map((f) => {
                    return (
                        <div className="flex flex-col">
                            <b>{f._sFile}</b>
                            <b onClick={() => 
                                download(f._sDownloadUrl ?? "", f._sFile ?? "")
                            }>
                                {f._sDownloadUrl}
                            </b>
                        </div>
                    )
                }) ?? <></>
            }
        </div>
    )
}