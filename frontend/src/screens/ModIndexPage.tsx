import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  DataApi,
  GenshinApi,
  StarRailApi,
  WutheringWavesApi,
  ZenlessApi,
} from "@/data/dataapi";
import { cn, useStateProducer } from "@/lib/utils";
import * as GbApi from "../../wailsjs/go/api/GbApi";
import { api } from "../../wailsjs/go/models";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { createContext, useEffect, useMemo } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDownIcon } from "lucide-react";
import { discoverGamePref, sortModPref, usePrefrenceAsState } from "@/data/prefs";
import { LogDebug } from "../../wailsjs/runtime/runtime";
import { Button } from "@/components/ui/button";

const gameDispalyNameFromIdx = (n: number) => {
  switch (n) {
    case 0:
      return "Genshin Impact";
    case 1:
      return "Honkai Star Rail";
    case 2:
      return "Zenless Zone Zero";
    case 3:
      return "Wuthering Waves";
    default:
      return ""
  }
};

const gameDispalyNameWithCatId = async (n: number) => {
  switch (n) {
    case 0:
      return {name: "Genshin Impact", id: await GenshinApi.skinId()};
    case 1:
      return {name:"Honkai Star Rail", id: await StarRailApi.skinId()};
    case 2:
      return {name:"Zenless Zone Zero", id: await ZenlessApi.skinId()};
    case 3:
      return {name:"Wuthering Waves", id: await WutheringWavesApi.skinId()};
    default:
      return {name: "", id: -1};
  }
};

const createCategoryCrumbs = async (id: number, skinIds: number[], subCats: api.CategoryListResponseItem[][]): Promise<Crumb[]> => {
  const skinIdIdx = skinIds.indexOf(id);
  const isTopLevelCat = skinIdIdx !== -1;
  if (isTopLevelCat) {
    return [{ name: gameDispalyNameFromIdx(skinIdIdx), path: `cats/${id}` }];
  } else {
    const item = subCats.firstNotNullOfOrNull((value, i) => {
      return value.firstNotNullOfOrNull((value) =>
        value._idRow === id ? { i, value } : undefined
      );
    });
    if (item?.value !== undefined) {
      const { name, id } = await gameDispalyNameWithCatId(item.i)
      return [
        {
          path: `cats/${id}`,
          name: name,
        },
        {
          path: `cats/${item.value._idRow!!}`,
          name: item.value._sName!!,
        },
      ];
    }
    return []
  }
};

type Sorts = "MostLiked" | "MostDownloaded" | "MostViewed" | "";
const sortName = (s: string | undefined) => {
  switch (s) {
    case "":
      return "Default";
    case "MostLiked":
      return "Most liked";
    case "MostDownloaded":
      return "Most downloaded";
    case "MostViewed":
      return "Most view";
    default:
      return "";
  }
};

const sortOptions: Sorts[] = ["MostLiked", "MostDownloaded", "MostViewed", ""];

export const DataApiContext = createContext<DataApi | undefined>(GenshinApi);
export const SortModeContext = createContext<Sorts>("");

type Crumb = { name: string; path: string };

const currentPathInfo = (path: string) => {
  const split = path.split("/");
  return {
    parts: split,
    isCategroy: split[split.length - 2] === "cats",
    id: Number(split[split.length - 1]),
  };
};

export function ModIndexPage() {

  const location = useLocation();
  const navigate = useNavigate();

  const skinIds = useStateProducer<number[]>(
    [],
    async (update) => {
      const ids = await Promise.all([
        GenshinApi.skinId(),
        StarRailApi.skinId(),
        ZenlessApi.skinId(),
        WutheringWavesApi.skinId(),
      ]);
      update(ids);
    },
    []
  );
  const subCats = useStateProducer<api.CategoryListResponseItem[][]>(
    [],
    async (update) => {
      update(
        await Promise.all(
          skinIds.map(async (item): Promise<api.CategoryListResponseItem[]> => {
            return await GbApi.Categories(item);
          })
        )
      );
    },
    [skinIds]
  );

  const topLevelCrumbs = useMemo<Crumb[]>(
    () =>
      skinIds.map((id, i) => {
        return { name: gameDispalyNameFromIdx(i), path: `cats/${id}` };
      }),
    [skinIds]
  );

  const crumbs = useStateProducer<Crumb[]>(
    [],
    async (update) => {
      const { isCategroy, id } = currentPathInfo(location.pathname);
      let crumbs: Crumb[] | undefined = undefined
      if (isCategroy) {
        crumbs = await createCategoryCrumbs(id, skinIds, subCats);
      } else {
        const modPage = await GbApi.ModPage(id);
        crumbs = [
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
        ]
      }
      update(crumbs ?? [{ name: "Genshin Impact", path: `cats/${await GenshinApi.skinId()}` }]);
    },
    [location.pathname, subCats]
  );

  const [sort, setSort] = usePrefrenceAsState<string>(sortModPref);

  useEffect(() => {
    try {
      const idx = location.pathname.indexOf("/mods/")
      discoverGamePref.Set(location.pathname.slice(idx + 6, location.pathname.length))
    } catch {
      LogDebug(`error reading first crumb id`)
    }
  }, [location.pathname])

  const dataApi = useMemo(() => {
    if (crumbs[0] === undefined) return undefined
    const path = crumbs[0].path
    const skinIdIdx = skinIds.indexOf(
      Number(path.slice(path.lastIndexOf("/") + 1, path.length))
    )
    switch (skinIdIdx) {
      case 0: return GenshinApi;
      case 1: return StarRailApi;
      case 2: return ZenlessApi;
      case 3: return WutheringWavesApi;
    }
    return undefined
  }, [crumbs, skinIds]);

  return (
    <DataApiContext.Provider value={dataApi}>
      <SortModeContext.Provider value={sort as Sorts}>
      <div className="flex flex-col">
        <div className="flex flex-row justify-between sticky top-2 end-0 m-2 z-30">
        <BreadCrumbList
          onCrumbSelected={(path) => navigate(path)}
          crumbs={crumbs}
          topLevelCrumbs={topLevelCrumbs}
        />
        {crumbs.length !== 3 ? 
          <div>
          <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-1 w-fit rounded-full backdrop-blur-lg backdrop-brightness-75 bg-primary/30 p-2 me-12 font-semibold text-foreground">
                {sortName(sort)}
                <ChevronDownIcon />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {sortOptions.map((s) => {
                  return (
                    <DropdownMenuItem onPointerDown={() => setSort(s)}>
                      <Button variant={"ghost"} className="w-full">
                        {sortName(s)}
                      </Button>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div> : undefined 
        }
        </div>
        <Outlet />
      </div>
      </SortModeContext.Provider>
    </DataApiContext.Provider>
  );
}

interface BreadCurmbListProps extends React.HTMLAttributes<HTMLDivElement> {
  topLevelCrumbs: Crumb[];
  crumbs: Crumb[];
  onCrumbSelected: (path: string) => void;
}

function BreadCrumbList({
  className,
  topLevelCrumbs,
  crumbs,
  onCrumbSelected,
}: BreadCurmbListProps) {
  return (
    <Breadcrumb
      className={cn(
        className,
        "w-fit rounded-full backdrop-blur-lg backdrop-brightness-75 bg-primary/30 z-30"
      )}
    >
      <BreadcrumbList>
        {crumbs.map((item, i, arr) => 
          <BreadCrumbListItem 
          crumbs={arr} 
          item={item} 
          i={i} 
          topLevelCrumbs={topLevelCrumbs} 
          onSelected={onCrumbSelected}/> 
        )}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

const Slash = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    className="stroke-primary"
  >
    <path d="M22 2 2 22" />
  </svg>
);

function BreadCrumbListItem({i, item, topLevelCrumbs, crumbs, onSelected}: {
   i: number,
   item: Crumb, 
   crumbs: Crumb[]
   topLevelCrumbs: Crumb[],
   onSelected: (path: string) => void
}) {
  if (i === 0) {
    return (
      <div className="flex flex-row items-center">
        <BreadcrumbItem className="font-semibold text-foreground hover:underline text-base p-2">
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-1">
              {item.name}
              <ChevronDownIcon />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {topLevelCrumbs.map((crumb) => {
                return (
                  <DropdownMenuItem
                    onClick={() => onSelected(crumb.path)}
                  >
                    {crumb.name}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </BreadcrumbItem>
        {crumbs.length > 1 ? (
          <BreadcrumbSeparator>
            <Slash />
          </BreadcrumbSeparator>
        ) : <></>}
      </div>
    );
  } else {
    return (
      <div className="flex flex-row items-center">
      <BreadcrumbItem className="font-semibold text-foreground hover:underline text-base p-2">
        <BreadcrumbLink onClick={() => onSelected(item.path)}>
          {item.name}
        </BreadcrumbLink>
      </BreadcrumbItem>
      {i !== crumbs.length - 1 ? (
        <BreadcrumbSeparator>
          <Slash />
        </BreadcrumbSeparator>
      ) : (
        <></>
      )}
    </div>
    )
  }
}

