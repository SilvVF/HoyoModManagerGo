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
import { useStateProducer } from "@/lib/utils";
import * as GbApi from "../../wailsjs/go/api/GbApi";
import { api } from "../../wailsjs/go/models";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { createContext, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { TopBarHeightPx } from "@/App";
import { CopySlashIcon, Divide, Slash } from "lucide-react";

const gameFromIdx = (n: number) => {
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

export function ModIndexPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const skinIds = useStateProducer<number[]>(
    [],
    async (update) => {
      update([
        await GenshinApi.skinId(),
        await StarRailApi.skinId(),
        await ZenlessApi.skinId(),
        await WutheringWavesApi.skinId(),
      ]);
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

  const crumbs = useStateProducer<Crumb[]>(
    [],
    async (update) => {
      const parts = location.pathname.split("/");
      const isCat = parts[parts.length - 2] === "cats";
      const id = Number(parts[parts.length - 1]);

      if (isCat) {
        const skinIdIdx = skinIds.indexOf(id);
        if (skinIdIdx !== -1) {
          update([
            {
              name: gameFromIdx(skinIdIdx),
              path: `cats/${id}`,
            },
          ]);
        } else {
          let cat: api.CategoryListResponseItem | undefined;
          let idx: number | undefined;

          subCats.forEach((cats, i) => {
            cats.forEach((c) => {
              if (c._idRow === id) {
                idx = i;
                cat = c;
              }
            });
          });
          if (cat !== undefined && idx !== undefined) {
            update([
              {
                path: `cats/${skinIds[idx]}`,
                name: gameFromIdx(idx),
              },
              {
                path: `cats/${cat._idRow!!}`,
                name: cat._sName ?? "",
              },
            ]);
          }
        }
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

  const dataApi = useMemo(() => {
    if (crumbs.length > 0) {
      const slashIdx = crumbs[0].path.lastIndexOf("/");
      const skinId = Number(
        crumbs[0].path.slice(slashIdx + 1, crumbs[0].path.length)
      );
      switch (skinIds.indexOf(skinId)) {
        case 0:
          return GenshinApi;
        case 1:
          return StarRailApi;
        case 2:
          return ZenlessApi;
        case 3:
          return WutheringWavesApi;
      }
    }
    return undefined;
  }, [crumbs, skinIds]);

  return (
    <DataApiContext.Provider value={dataApi}>
      <div className="flex flex-col">
        <div
          className={`flex flex-col w-full min-h-20 sticky top-[${TopBarHeightPx}px] z-20`}
        >
          <div className="flex flex-row">
            {skinIds.map((id, i) => {
              return (
                <Badge
                  variant={
                    crumbs.length > 0 && gameFromIdx(i) === crumbs[0].name
                      ? "default"
                      : "outline"
                  }
                  className="p-2 m-2 backdrop-blur-md font-semibold text-sm border-primary"
                  onClick={() => navigate(`cats/${id}`)}
                >
                  {gameFromIdx(i)}
                </Badge>
              );
            })}
          </div>
          <Breadcrumb className="border border-primary border-t-1 backdrop-blur-md rounded-full w-fit m-2">
            <BreadcrumbList>
              {crumbs.map((item, i) => {
                return (
                  <>
                    <BreadcrumbItem className="font-semibold text-primary text-sm text-decoration-line: underline p-2">
                      <BreadcrumbLink onClick={() => navigate(item.path)}>
                        {item.name}
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    {i !== crumbs.length - 1 ? (
                      <BreadcrumbSeparator>
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
                      </BreadcrumbSeparator>
                    ) : (
                      <></>
                    )}
                  </>
                );
              })}
            </BreadcrumbList>
          </Breadcrumb>
        </div>
        <Outlet />
      </div>
    </DataApiContext.Provider>
  );
}
