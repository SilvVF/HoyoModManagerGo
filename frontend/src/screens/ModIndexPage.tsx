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
import { createContext, useMemo } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDownIcon } from "lucide-react";

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
      return "";
  }
};

export const DataApiContext = createContext<DataApi | undefined>(GenshinApi);

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
  //prettier-ignore
  const skinIds = useStateProducer<number[]>([], async (update) => {
      const ids = await Promise.all([
        GenshinApi.skinId(),
        StarRailApi.skinId(),
        ZenlessApi.skinId(),
        WutheringWavesApi.skinId(),
      ]);
      update(ids);
  },[] );
  //prettier-ignore
  const subCats = useStateProducer<api.CategoryListResponseItem[][]>([], async (update) => {
      update(
        await Promise.all(
          skinIds.map(async (item): Promise<api.CategoryListResponseItem[]> => {
            return await GbApi.Categories(item);
          })
      ));
  }, [skinIds]);

  const createCategoryCrumbs = (id: number): Crumb[] => {
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
        return [
          {
            path: `cats/${item.i}`,
            name: gameDispalyNameFromIdx(item.i),
          },
          {
            path: `cats/${item.value._idRow!!}`,
            name: item.value._sName!!,
          },
        ];
      }
    }
    return [];
  };
  //prettier-ignore
  const topLevelCrumbs = useMemo<Crumb[]>(() => skinIds.map((id, i) => {
    return { name: gameDispalyNameFromIdx(i), path: `cats/${id}` }
  }), [skinIds])

  // prettier-ignore
  const crumbs = useStateProducer<Crumb[]>([], async (update) => {
      const { isCategroy, id } = currentPathInfo(location.pathname);
      if (isCategroy) {
        update(createCategoryCrumbs(id));
      } else {
        const modPage = await GbApi.ModPage(id);
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
        ]);
      }
    },
    [location.pathname, subCats]
  );
  // prettier-ignore
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
      <div className="flex flex-col">
        <BreadCrumbList
          className="sticky top-2 m-2"
          onCrumbSelected={(path) => navigate(path)}
          crumbs={crumbs}
          topLevelCrumbs={topLevelCrumbs}
        />
        <Outlet />
      </div>
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
        {crumbs.map((item, i) => {
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
                            onClick={() => onCrumbSelected(crumb.path)}
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
                ) : (
                  <></>
                )}
              </div>
            );
          }
          return (
            <div className="flex flex-row items-center">
              <BreadcrumbItem className="font-semibold text-foreground hover:underline text-base p-2">
                <BreadcrumbLink onClick={() => onCrumbSelected(item.path)}>
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
          );
        })}
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
