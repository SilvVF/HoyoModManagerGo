import {
  GenshinApi,
  StarRailApi,
  WutheringWavesApi,
  ZenlessApi,
} from "@/data/dataapi";
import { discoverGamePref } from "@/data/prefs";
import { useStateProducer } from "@/lib/utils";
import { useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { api } from "wailsjs/go/models";
import { LogDebug } from "wailsjs/runtime/runtime";
import * as GbApi from "wailsjs/go/api/GbApi";

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

const currentPathInfo = (path: string) => {
  const split = path.split("/");
  return {
    parts: split,
    isCategroy: split[split.length - 2] === "cats",
    id: Number(split[split.length - 1]),
  };
};

const gameDispalyNameWithCatId = async (n: number) => {
  switch (n) {
    case 0:
      return { name: "Genshin Impact", id: await GenshinApi.skinId() };
    case 1:
      return { name: "Honkai Star Rail", id: await StarRailApi.skinId() };
    case 2:
      return { name: "Zenless Zone Zero", id: await ZenlessApi.skinId() };
    case 3:
      return { name: "Wuthering Waves", id: await WutheringWavesApi.skinId() };
    default:
      return { name: "", id: -1 };
  }
};

export type Crumb = { name: string; path: string };

const createCategoryCrumbs = async (
  id: number,
  skinIds: number[],
  subCats: api.CategoryListResponseItem[][]
): Promise<Crumb[]> => {
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
      const { name, id } = await gameDispalyNameWithCatId(item.i);
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
    return [];
  }
};

export function useModCrumbState() {
  const location = useLocation();

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
      let crumbs: Crumb[] | undefined = undefined;
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
        ];
      }
      update(
        crumbs ?? [
          { name: "Genshin Impact", path: `cats/${await GenshinApi.skinId()}` },
        ]
      );
    },
    [location.pathname, subCats]
  );

  useEffect(() => {
    try {
      const idx = location.pathname.indexOf("/mods/");
      discoverGamePref.Set(
        location.pathname.slice(idx + 6, location.pathname.length)
      );
    } catch {
      LogDebug(`error reading first crumb id`);
    }
  }, [location.pathname]);

  return {
    crumbs: crumbs,
    skinIds: skinIds,
    topLevelCrumbs: topLevelCrumbs,
  };
}
