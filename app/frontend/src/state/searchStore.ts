import { Game } from "@/data/dataapi";
import DB from "@/data/database";
import { types } from "wailsjs/go/models";
import { LogDebug } from "wailsjs/runtime/runtime";
import { create } from "zustand";

type Bang = "tag" | "mod" | "character" | "game" | "g" | "texture";

type BangWithQuery = {
  bang: Bang;
  query: string;
};

type CharacterResult = types.CharacterWithModsAndTags;

type UrlResult = {
  path: string;
  text: string;
  url: string;
};

type SearchResult = {
  urlResults: UrlResult[];
  dataResults: CharacterResult[];
};

function extractBangText(input: string): BangWithQuery[] {
  const regex = /!(tag|mod|character|game|g)\s+([^\!]+)/g;
  const matches = Array.from(input.matchAll(regex));

  return matches.map((match) => ({
    bang: match[1] as Bang,
    query: match[2].trim(),
  }));
}

function gbUrlParse(url: string): string | undefined {
  const match = url.match(/https:\/\/gamebanana\.com\/mods\/(.+)/);
  return match ? match[1] : undefined;
}

function gameFromText(query: string): number | undefined {
  try {
    const id = Number(query);
    if (id in Object.values(Game)) {
      return id;
    }
  } catch {
    const key = Object.keys(Game).firstNotNullOfOrNull((key) => {
      key.includes(query);
    });
    if (key) {
      return Game[key];
    }
  }
  return undefined;
}

interface SearchState {
  query: string;
  searching: boolean;
  results: SearchResult;
  _cancelSearch: () => void;
  _performSearch: () => void;
  onQueryChange: (value: string) => void;
  onSearch: () => void;
}

export const useSearchStore = create<SearchState>((set, get) => ({
  query: "",
  results: {
    urlResults: [],
    dataResults: [],
  },
  searching: false,
  _cancelSearch: () => {},
  _performSearch: async () => {
    if (get().searching) return;
    set({ searching: true });

    const query = get().query;

    if (query.trim() === "") {
      set({
        results: {
          urlResults: [],
          dataResults: [],
        },
        searching: false,
      });
      return;
    }

    const urlResult: UrlResult[] = [];
    const subPath = gbUrlParse(query);
    if (subPath !== undefined) {
      urlResult.push({
        path: `/mods/${subPath}`,
        text: "Search for url on game bannana",
        url: query,
      });
    }

    let bangsWithQuery = extractBangText(query);
    if (bangsWithQuery.isEmpty()) {
      bangsWithQuery = [{ bang: "g", query: query }];
    }

    const games: number[] = [];
    const mods: string[] = [];
    const characters: string[] = [];
    const tags: string[] = [];
    const textures: string[] = [];

    for (let i = 0; i < bangsWithQuery.length; i++) {
      const { bang, query } = bangsWithQuery[i];
      LogDebug(bang + " " + query);
      switch (bang) {
        case "tag":
          tags.push(query);
          break;
        case "mod":
          mods.push(query);
          break;
        case "character":
          characters.push(query);
          break;
        case "game":
          const g = gameFromText(query);
          if (g) {
            games.push(g);
          }
          break;
        case "texture":
          textures.push(query);
          break;
        case "g":
          textures.push(query);
          tags.push(query);
          mods.push(query);
          characters.push(query);
          const gm = gameFromText(query);
          if (gm) {
            games.push(gm);
          }
          break;
      }
    }

    LogDebug("games: " + games);
    LogDebug("mods: " + mods);
    LogDebug("tags: " + tags);
    LogDebug("characters: " + characters);

    if (games.length <= 0) {
      games.push(...Object.values(Game));
    }

    const searchResult = (
      await Promise.all(
        games.map((g) =>
          // game types.Game, modFileName string, characterName string, tagName string
          DB.queries.selectCharacterWithModsTagsAndTextures(
            g,
            mods[0] ?? "",
            characters[0] ?? "",
            tags[0] ?? "",
          ),
        ),
      )
    ).flat();

    set({
      results: {
        urlResults: urlResult,
        dataResults: searchResult,
      },
      searching: false,
    });
  },
  onQueryChange: (value: string) => {
    get()._cancelSearch();
    const timeout = setTimeout(get()._performSearch, 200);
    set({
      query: value,
      _cancelSearch: () => clearTimeout(timeout),
    });
  },
  onSearch: () => {
    get()._cancelSearch();
    const timeout = setTimeout(get()._performSearch, 0);
    set({
      _cancelSearch: () => clearTimeout(timeout),
    });
  },
}));
