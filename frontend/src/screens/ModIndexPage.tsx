import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { GenshinApi, StarRailApi } from "@/data/dataapi";
import { useStateProducer } from "@/lib/utils";
import * as GbApi from "../../wailsjs/go/api/GbApi"
import { api } from "../../wailsjs/go/models"
import { Outlet, useLocation, useNavigate } from "react-router-dom";

const gameFromIdx = (n: number) => {
    switch (n) {
        case 1:
            return "Genshin Impact"
        case 2:
            return "Honkai Star Rail"
        case 3:
            return "Zenless Zone Zero"
        case 4: 
            return "Wuthering Waves"
        default: 
            return ""
    }
}

type Crumb = {name: string, path: string}

export function ModIndexPage() {

    const location = useLocation()
    const navigate = useNavigate()

    const skinIds = useStateProducer<number[]>([], async (update) => {
        update([await GenshinApi.skinId(), await StarRailApi.skinId()])
    }, [])

    const subCats = useStateProducer<api.CategoryListResponseItem[][]>([], async (update) => {
        update(
            await Promise.all(skinIds.map(async (item): Promise<api.CategoryListResponseItem[]> => {
                return await GbApi.Categories(item)
            }))
        )
    }, [skinIds])

    const crumbs = useStateProducer<Crumb[]>([], async (update) => {
        const parts = location.pathname.split('/')
        const isCat = parts[parts.length - 2] === 'cats'
        const id = Number(parts[parts.length - 1])

        if (isCat) {
            const skinIdIdx = skinIds.indexOf(id)
            if (skinIdIdx !== -1) {
                update([
                    {
                        name: gameFromIdx(skinIdIdx),
                        path: `cats/${id}` 
                    }
                ])
            } else {

                let cat: api.CategoryListResponseItem | undefined
                let idx: number | undefined
                
                subCats.forEach((cats, i) => {
                    cats.forEach((c) => {
                        if (c._idRow === id) {
                            idx = i
                            cat = c
                        }
                    })
                })
                if (cat !== undefined && idx !== undefined) {
                    update([
                        {
                            path: `cats/${skinIds[idx]}`,
                            name: gameFromIdx(idx), 
                        }, 
                        {
                            path:`cats/${cat._idRow!!}`,
                            name: cat._sName ?? ""
                        }
                    ])
                } 
        
            }
        } else {
            const modPage = await GbApi.ModPage(id)

            update([
                {
                    name: modPage._aGame?._sName ?? "",
                    path: `cats/${modPage?._aSuperCategory?._idRow}`,
                },
                {
                    name: modPage._aCategory?._sName ?? "",
                    path: `cats/${modPage?._aCategory?._idRow}`,
                },
                {
                    name: modPage._sName ?? "",
                    path: `${modPage._idRow}`,
                },
            ])
        }
    }, [location.pathname, subCats]) 

    return (
        <div className="flex flex-col">
               <Breadcrumb className="p-4 absolute top-0 w-full min-h-20 max-h-20 bg-black bg-opacity-60 z-20">
               <BreadcrumbList>
                {
                    crumbs.map((item, i) => {
                        return (
                            <>
                            <BreadcrumbItem className="text-lg">
                                <BreadcrumbLink onClick={() => navigate(item.path)}>{item.name}</BreadcrumbLink>
                            </BreadcrumbItem>
                            {i !== (crumbs.length - 1) ? (
                              <BreadcrumbSeparator />
                            ) : <></>
                            }
                            </>
                        )
                    })
                }
              </BreadcrumbList>
            </Breadcrumb>
            <div className="mt-20">
                <Outlet />
            </div>
        </div>
    )
}