import { cssString, useStateProducer } from "@/lib/utils"
import * as GbApi from "../../wailsjs/go/api/GbApi"
import { GenshinApi } from "@/data/dataapi"
import { api } from "../../wailsjs/go/models"
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination"
import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { LogPrint } from "../../wailsjs/runtime/runtime"

export default function ModBrowseScreen() {

    const dataApi = GenshinApi

    const categories = useStateProducer<api.CategoryListResponseItem[]>([], async (update) => {
        update(await GbApi.Categories(await dataApi.skinId()))
    }, [dataApi])

    const [page, setPage] = useState(1)


    const categoryResponse = useStateProducer<api.CategoryResponse | undefined>(undefined, async (update) => {
        update(await GbApi.CategoryContent(await dataApi.skinId(), 15, page, ""))
    }, [page])

    const lastPage = useStateProducer<number>(1, async (update) => {
        const records = categoryResponse?._aMetadata._nRecordCount 
        const perPage = categoryResponse?._aMetadata._nPerpage
        if (records != undefined && perPage != undefined) {
            update(records / perPage)
        }
    }, [categoryResponse?._aMetadata])

    return (
        <div className="flex flex-row justify-end items-start max-w-full min-h-screen min-w-full">
            <CategoryItemsList res={categoryResponse}></CategoryItemsList>
            <div className="absolute bottom-6 start-1/2 -translate-x-1/2 bg-white bg-opacity-50 rounded-lg">
                <Paginator page={page} lastPage={lastPage} goToPage={(page) => setPage(page)} />
            </div>
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

    const navigate = useNavigate()

    if (res === undefined) {
        return (
            <div></div>
        )
    }

    return (
        <div className="grid grid-cols-3">
            {
                 res._aRecords?.map((record) => {
                    const image = record._aPreviewMedia._aImages[0]
                    return (
                        <div className="col-span-1 aspect-video">
                             <img
                                    onClick={() => {
                                        LogPrint("/mod/" + record._idRow)
                                        navigate("/mod/" + record._idRow)
                                    }}
                                    className="h-96 w-full object-cover object-top fade-in"  
                                    src={`${image._sBaseUrl}/${image._sFile}`}
                                    alt={record._sName}>
                            </img>
                            <b style={cssString(record._aSubmitter?.sSubjectShaperCssCode)}>
                                {record._sName}
                            </b>
                        </div>
                    )
                })
            }
        </div>
    )
}

const range = (start: number, stop: number, step: number) => Array.from({ length: (stop - start) / step + 1}, (_, i) => start + (i * step));

function Paginator(
    props: { page: number, lastPage: number, goToPage: (page: number) => void }
) {

    const list = useMemo (() => {
        const minPage = Math.max(1, (props.page - 4))
        const mp =  (props.page + 9 - (props.page - minPage))
        const maxPage = Math.min(Math.max(1, props.lastPage),   Math.max(1, mp))

        return range(minPage, maxPage, 1);
    }, [props.page, props.lastPage])

    return (
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious onClick={() => props.goToPage(props.page - 1)} />
          </PaginationItem>
         
         {
            list.map((page) => {
                return (
                    <PaginationItem>
                        <PaginationLink isActive={page == props.page} onClick={() => props.goToPage(page)}>
                            {page}
                        </PaginationLink>
                    </PaginationItem>
                )
            })
         }
          <PaginationItem>
            <PaginationNext onClick={() => props.goToPage(props.page + 1)}/>
          </PaginationItem>

        </PaginationContent>
      </Pagination>
    )
}

