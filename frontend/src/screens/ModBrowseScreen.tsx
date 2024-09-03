import { cssString, useStateProducer } from "@/lib/utils"
import * as GbApi from "../../wailsjs/go/api/GbApi"
import { api } from "../../wailsjs/go/models"
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination"
import { useEffect, useMemo, useState } from "react"
import { useLocation, useNavigate, useParams } from "react-router-dom"
import { Button } from "@/components/ui/button"

export default function ModBrowseScreen() {

    const { id } = useParams();
    const location = useLocation()
    const navigate = useNavigate()

    const categories = useStateProducer<api.CategoryListResponseItem[]>([], async (update) => {
        update(await GbApi.Categories(Number(id)))
    }, [id])

    const [page, setPage] = useState(1)
    useEffect(() => setPage(1), [id])


    const categoryResponse = useStateProducer<api.CategoryResponse | undefined>(undefined, async (update) => {
        update(await GbApi.CategoryContent(Number(id), 30, page, ""))
    }, [page, id])

    const lastPage = useStateProducer<number>(1, async (update) => {
        const records = categoryResponse?._aMetadata._nRecordCount 
        const perPage = categoryResponse?._aMetadata._nPerpage
        if (records != undefined && perPage != undefined) {
            update(records / perPage)
        }
    }, [categoryResponse?._aMetadata])

    return (
        <div className="flex flex-row justify-end items-start max-w-full h-full min-w-full">
            <CategoryItemsList res={categoryResponse}></CategoryItemsList>
            <div className="absolute bottom-4 -translate-y-1 start-1/2 -translate-x-1/2 bg-slate-700 bg-opacity-70 rounded-lg">
                <Paginator page={page} lastPage={lastPage} goToPage={(page) => setPage(Math.min(Math.max(1, page), lastPage))} />
            </div>
            <div className="flex flex-col w-fit me-2">
                {
                    
                    categories.map((c) => {
                        return (
                        <Button
                            key={c._sName}
                            onClick={() => navigate("/mods/cats/" + c._idRow)}
                            variant={c._idRow !== undefined && location.pathname.includes(c._idRow.toString()) ? 'secondary' : 'ghost'} 
                            className="min-w-max justify-start font-normal"
                          >
                            {c._sName}
                          </Button>
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
            <div>
                <b>error loading content</b>
            </div>
        )
    }

    return (
        <div className="grid grid-cols-3">
            {
                 res._aRecords?.map((record) => {
                    const image = record._aPreviewMedia._aImages[0]
                    return (
                        <div className="col-span-1 aspect-video m-2">
                             <img
                                    onClick={() => navigate("/mods/" + record._idRow)}
                                    className="h-96 w-full object-cover  rounded-lg object-top fade-in"  
                                    src={`${image._sBaseUrl}/${image._sFile}`}
                                    alt={record._sName}>
                            </img>
                            <p style={cssString(record._aSubmitter?.sSubjectShaperCssCode)}>
                                {record._sName}
                            </p>
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

