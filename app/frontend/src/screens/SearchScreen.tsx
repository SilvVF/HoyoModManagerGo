import { create } from "zustand";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SearchIcon } from "lucide-react";
import { LogDebug } from "../../wailsjs/runtime/runtime";
import { useShallow } from "zustand/shallow";
import {
  EnableModById,
  EnableTextureById,
  RenameMod,
  RenameTexture,
  SelectCharacterWithModsTagsAndTextures,
} from "wailsjs/go/core/DbHelper";
import { Game } from "@/data/dataapi";
import { types } from "wailsjs/go/models";
import {
  CharacterInfoCard,
  ModActionsDropDown,
  TextureActionDropDown,
} from "@/components/CharacterInfoCard";
import { NameDialog } from "@/components/NameDialog";
import { useMemo, useState } from "react";
import { type Pair } from "@/lib/tsutils";
import { Delete, DeleteTexture } from "wailsjs/go/core/Downloader";
import { Separator } from "@/components/ui/separator";
import { Dialog } from "@/components/ui/dialog";
import useTransitionNavigate from "@/hooks/useCrossfadeNavigate";
import { SplitTexture } from "wailsjs/go/main/App";

interface SearchState {
  query: string;
  searching: boolean;
  results: SearchResult;
  _cancelSearch: () => void;
  _performSearch: () => void;
  onQueryChange: (value: string) => void;
  onSearch: () => void;
}

export type SearchDialogType =
  | "rename_mod"
  | "create_tag"
  | "rename_tag"
  | "rename_texture";
export type SearchDialog = Pair<SearchDialogType, number>;

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

const useSearchStore = create<SearchState>((set, get) => ({
  query: "",
  results: {
    urlResults: [],
    dataResults: [],
  },
  searching: false,
  _cancelSearch: () => { },
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
          SelectCharacterWithModsTagsAndTextures(
            g,
            mods[0] ?? "",
            characters[0] ?? "",
            tags[0] ?? ""
          )
        )
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
  onQueryChange: (value) => {
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

export function SearchScreen() {
  const navigate = useTransitionNavigate();
  const results = useSearchStore(useShallow((state) => state.results));

  const [dialog, setDialog] = useState<SearchDialog | undefined>(undefined);

  const refreshCharacters = useSearchStore((state) => state.onSearch);

  const deleteMod = async (id: number) => {
    Delete(id).then(refreshCharacters);
  };

  const enableMod = async (id: number, enabled: boolean) => {
    EnableModById(enabled, id).then(refreshCharacters);
  };

  const deleteTexture = async (id: number) => {
    DeleteTexture(id).then(refreshCharacters);
  };


  const splitTexture = async (id: number) => {
    SplitTexture(id).then(refreshCharacters);
  };

  const enableTexture = async (id: number, enabled: boolean) => {
    EnableTextureById(enabled, id).then(refreshCharacters);
  };

  return (
    <div className="flex flex-col h-full w-full items-center justify-top">
      <SearchOverlayOptions
        dialog={dialog}
        setDialog={setDialog}
        refreshCharacters={() => { }}
      />
      <SearchBar />
      <div className="w-full flex flex-col p-4">
        <h3>
          Search specific categorys by prefixing with a bang '!' ex. !character
          Ayaka. Also urls in the form of https://gamebanana.com/mods/(.+)/
        </h3>
        <div className="flex flex-row space-x-4 p-4">
          <h6>!tag</h6>
          <Separator orientation="vertical" />
          <h6>!mod</h6>
          <Separator orientation="vertical" />
          <h6>!character</h6>
          <Separator orientation="vertical" />
          <h6>!game</h6>
          <Separator orientation="vertical" />
          <h6>!g 'global'</h6>
          <Separator orientation="vertical" />
          <h6>!texture</h6>
        </div>
      </div>
      <Dialog>
        {results.urlResults.map((res) => (
          <Button onClick={() => navigate(res.path)}>{res.text}</Button>
        ))}
        <div className="w-full columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4 mx-2 pb-4">
          {results.dataResults.map((res) => {
            return (
              <div key={res.characters.id} className="break-inside-avoid mb-4">
                <CharacterInfoCard
                  key={res.characters.id}
                  enableMod={enableMod}
                  cmt={res}
                  modDropdownMenu={(mwt) => (
                    <ModActionsDropDown
                      onEnable={() => enableMod(mwt.mod.id, !mwt.mod.enabled)}
                      onDelete={() => deleteMod(mwt.mod.id)}
                      onRename={() =>
                        setDialog({ x: "rename_mod", y: mwt.mod.id })
                      }
                      onView={() => {
                        if (mwt.mod.gbId !== 0) {
                          navigate(`/mods/${mwt.mod.gbId}`);
                        }
                      }}
                      onKeymapEdit={() => navigate(`/keymap/${mwt.mod.id}`)}
                    />
                  )}
                  textureDropdownMenu={(t) => (
                    <TextureActionDropDown
                      onSplit={() => splitTexture(t.id)}
                      onEnable={() => enableTexture(t.id, !t.enabled)}
                      onDelete={() => deleteTexture(t.id)}
                      onRename={() => setDialog({ x: "rename_texture", y: t.id })}
                      onView={() => {
                        if (t.gbId !== 0) {
                          navigate(`/mods/${t.gbId}`);
                        }
                      }}
                    />
                  )}
                  enableTexture={enableTexture}
                />
              </div>
            );
          })}
        </div>
      </Dialog>
    </div>
  );
}

function SearchOverlayOptions({
  dialog,
  setDialog,
  refreshCharacters,
}: {
  dialog: SearchDialog | undefined;
  setDialog: (dialog: SearchDialog | undefined) => void;
  refreshCharacters: () => void;
}) {
  const dialogSettings = useMemo(() => {
    return {
      rename_mod: {
        title: "Rename mod",
        description:
          "rename the current mod (this will change the folder name in files)",
        onSuccess: (id: number, name: string) => {
          RenameMod(id, name).then(refreshCharacters);
        },
      },
      create_tag: {
        title: "Create tag",
        description: "create a tag for the mod",
        onSuccess: () => { },
      },
      rename_tag: {
        title: "Rename tag",
        description: "Rename the current tag",
        onSuccess: () => { },
      },
      rename_texture: {
        title: "Rename Texture",
        description:
          "rename the current texture (this will change the folder name in files)",
        onSuccess: (id: number, name: string) => {
          RenameTexture(id, name).then(refreshCharacters);
        },
      },
    };
  }, []);

  const settings = dialog !== undefined ? dialogSettings[dialog.x] : undefined;

  return (
    <div className="absolute bottom-4 -translate-y-1/2 end-12 flex flex-row z-10">
      <NameDialog
        title={settings?.title ?? ""}
        description={settings?.description ?? ""}
        open={dialog !== undefined}
        onOpenChange={() => setDialog(undefined)}
        onSuccess={(n) => settings!!.onSuccess(dialog!!.y, n)}
      />
    </div>
  );
}

function SearchBar() {
  const onSearchChange = useSearchStore((state) => state.onQueryChange);
  const query = useSearchStore(useShallow((state) => state.query));
  const onSearch = useSearchStore((state) => state.onSearch);
  const handleChange = (event: any) => {
    onSearchChange(event.target.value);
  };

  return (
    <div className="flex w-3/4 items-center space-x-2">
      <Input
        value={query}
        className="p-4 m-4"
        placeholder="Search..."
        onInput={handleChange}
        onSubmit={onSearch}
      />
      <Button size="icon" onClick={onSearch}>
        <SearchIcon />
      </Button>
    </div>
  );
}
