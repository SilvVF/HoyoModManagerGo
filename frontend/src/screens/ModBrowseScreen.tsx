import { useStateProducer } from "@/lib/utils"
import * as GbApi from "../../wailsjs/go/api/GbApi"
import { GenshinApi } from "@/data/dataapi"
import { api } from "wailsjs/go/models"

export default function ModBrowseScreen() {

    const dataApi = GenshinApi

    const categories = useStateProducer<api.CategoryListResponseItem[]>([], async (update) => {
        update(await GbApi.Categories(await dataApi.skinId()))
    }, [dataApi])

    const categoryResponse = useStateProducer<api.CategoryResponse | undefined>(undefined, async (update) => {
        update(await GbApi.CategoryContent(await dataApi.skinId(), 15, 1, ""))
    }, [])

    return (
        <div className="flex flex-row justify-end items-start">
            <CategoryItemsList res={categoryResponse}></CategoryItemsList>
            <div className="flex flex-col">
                {
                    categories.map((c) => {
                        return (
                            <b>{c._sName}</b>
                        )
                    })
                }
            </div>
        </div>
    )
}

function CategoryItemsList({ res }: { res: api.CategoryResponse | undefined }) {

    if (res === undefined) {
        return (
            <div></div>
        )
    }

    return (
        <div>
            {
                 res._aRecords.map((record) => {
                    return (
                        <b className="col-span-1">
                            {record._sName}
                        </b>
                    )
                })
            }
        </div>
    )
}

