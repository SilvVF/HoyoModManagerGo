import { useEffect, useMemo, useRef, useState } from "react";
import { DataApi, Game } from "../data/dataapi";
import { SyncType, useSync } from "../data/sync";
import { cn, useStateProducer } from "../lib/utils";
import { types } from "wailsjs/go/models";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  genshinElementPref,
  GoPref,
  honkaiElementPref,
  modsAvailablePref,
  usePrefQuery,
  wuwaElementPref,
  zzzElementPref,
} from "@/data/prefs";
import { useDownloadStore } from "@/state/downloadStore";
import { useShallow } from "zustand/shallow";
import {
  CharacterInfoCard,
  ModActionsDropDown,
  TextureActionDropDown,
} from "@/components/CharacterInfoCard";
import { usePlaylistStore } from "@/state/playlistStore";
import { Columns3Icon, GridIcon, SearchIcon, XIcon } from "lucide-react";
import { EventsOn } from "wailsjs/runtime/runtime";
import useCrossfadeNavigate from "@/hooks/useCrossfadeNavigate";
import { AppDialogType, useDialogStore } from "@/components/appdialog";
import { useGenerator } from "@/data/generator";
import DB, { useDbQuery } from "@/data/database";

const getElementPref = (game: number): GoPref<string[]> => {
  switch (game) {
    case Game.Genshin:
      return genshinElementPref;
    case Game.StarRail:
      return honkaiElementPref;
    case Game.ZZZ:
      return zzzElementPref;
    case Game.WuWa:
      return wuwaElementPref;
    default:
      throw Error("invalid game");
  }
};

type MultiSelectState = {
  selectedIds: number[];
  enabled: boolean;
  selected: types.CharacterWithModsAndTags[];
  events: {
    clearMultiSelected: () => void;
    setMultiSelectEnabled: (enabled: boolean) => void;
    toggleMultiSelected: (id: number) => void;
    deleteCharacters: () => void;
  };
};

const useMultiSelectState = (
  cwmt: types.CharacterWithModsAndTags[],
): MultiSelectState => {
  const [multiSelect, setMultiSelect] = useState(false);
  const [selectedCardsUnfiltered, setSelectedCards] = useState<
    number[] | undefined
  >(undefined);

  const selectedCards = useMemo(() => {
    return selectedCardsUnfiltered?.filter(
      (id) => cwmt.any((c) => c.characters.id === id) ?? [],
    );
  }, [cwmt, selectedCardsUnfiltered]);

  const multiSelectedCharacters = useMemo(() => {
    return (
      selectedCards?.map((id) => cwmt.find((c) => c.characters.id === id)!) ??
      []
    );
  }, [cwmt, selectedCards]);

  return {
    selectedIds: selectedCards ?? [],
    enabled: multiSelect,
    selected: multiSelectedCharacters,
    events: {
      clearMultiSelected: () => setSelectedCards([]),
      setMultiSelectEnabled: (enabled: boolean) => {
        if (enabled) {
          setMultiSelect(enabled);
        } else {
          setSelectedCards([]);
          setMultiSelect(enabled);
        }
      },
      toggleMultiSelected: (id: number) => {
        if (!multiSelect) return;

        if (selectedCardsUnfiltered?.includes(id)) {
          setSelectedCards((p) => p?.filter((cid) => cid !== id));
        } else {
          setSelectedCards((p) => [...(p ?? []), id]);
        }
      },
      deleteCharacters: () => {
        const toDelete = selectedCards?.map(
          (id) => cwmt.find((c) => c.characters.id === id)!,
        )!;
        Promise.all(
          toDelete.map((c) =>
            DB.mutations.deleteCharacter(
              c.characters.name,
              c.characters.id,
              c.characters.game,
            ),
          ),
        );
      },
    },
  };
};

const useFilterState = (
  characters: types.CharacterWithModsAndTags[],
  game: number,
): FilterState => {
  const [{ data: selectedElements }, setSelectedElements] = usePrefQuery(
    useMemo(() => getElementPref(game), [game]),
  );

  const [searchActive, setSearchActive] = useState(false);
  const [query, setQuery] = useState("");

  const [{ data: available }, setAvailableOnly] =
    usePrefQuery(modsAvailablePref);

  const [onlyCustom, setOnlyCustom] = useState(false);

  const filteredCharacters = useMemo(() => {
    if (selectedElements !== undefined && available !== undefined) {
      return characters
        .filter(
          (cwmt) =>
            selectedElements.includes(cwmt.characters.element.toLowerCase()) ||
            selectedElements.isEmpty(),
        )
        .filter((cwmt) => (available ? !cwmt.modWithTags.isEmpty() : true))
        .filter((cwmt) => (onlyCustom ? cwmt.characters.custom : true))
        .filter((cwmt) =>
          query.isBlank()
            ? true
            : cwmt.characters.name.includes(query) ||
              cwmt.modWithTags.any(
                (mt) =>
                  mt.mod.filename.includes(query) ||
                  mt.tags.any((t) => t.name.includes(query)),
              ),
        );
    } else {
      return characters;
    }
  }, [characters, selectedElements, available, onlyCustom, query]);

  const onElementSelected = (element: string) => {
    setSelectedElements((prev) => {
      const lowerElement = element.toLowerCase();
      if (prev?.includes(lowerElement)) {
        return prev.filter((it) => it !== lowerElement);
      } else {
        return [...(prev ?? []), lowerElement];
      }
    });
  };

  return {
    onlyCustom: onlyCustom ?? false,
    setOnlyCustom: setOnlyCustom,
    setQuery: setQuery,
    query: query,
    availableOnly: available ?? false,
    setAvailableOnly: () => setAvailableOnly((prev) => !prev),
    filteredCharacters: filteredCharacters,
    selectedElements: selectedElements ?? [],
    toggleElementFilter: onElementSelected,
    searchActive: searchActive,
    setSearchActive: setSearchActive,
    toggleSearchActive: () => setSearchActive((p) => !p),
  };
};

interface FilterState {
  onlyCustom: boolean;
  setOnlyCustom: (custom: boolean) => void;
  setQuery: (query: string) => void;
  query: string;
  availableOnly: boolean;
  setAvailableOnly: (available: boolean) => void;
  filteredCharacters: types.CharacterWithModsAndTags[];
  selectedElements: string[];
  toggleElementFilter: (element: string) => void;
  searchActive: boolean;
  setSearchActive: (active: boolean) => void;
  toggleSearchActive: () => void;
}

const GRID_KEY = "GRID_KEY";

const useGrid = () => {
  const [grid, setGrid] = useState(localStorage.getItem(GRID_KEY) !== null);
  return {
    grid,
    toggle: () => {
      if (grid) {
        localStorage.removeItem(GRID_KEY);
        setGrid(false);
      } else {
        localStorage.setItem(GRID_KEY, "");
        setGrid(true);
      }
    },
  };
};

const useGameScreenPresenter = (
  dataApi: DataApi,
  game: number,
): GameScreenState => {
  const updates = usePlaylistStore(useShallow((state) => state.updates));
  const running = useDownloadStore(useShallow((state) => state.running));
  const [syncId, setSyncId] = useState(0);
  const elements = useStateProducer<string[]>(
    [],
    async (update) => {
      dataApi.elements().then((elements) => update(elements));
    },
    [dataApi],
  );

  useEffect(() => {
    const cancel = EventsOn("sync", (data) => {
      if (game === data.game) {
        setSyncId((id) => id + 1);
      }
    });

    return cancel;
  });

  const { data: characters } = useDbQuery(
    dataApi.charactersWithModsAndTags,
    ["mods", "characters", "tags"],
    [dataApi, syncId, running, updates],
  );

  const filterState = useFilterState(characters ?? [], game);
  const multiSelectState = useMultiSelectState(characters ?? []);

  return {
    filterState: filterState,
    multiSelectState: multiSelectState,
    elements: elements,
    events: {
      handleUnselectAll: () => {
        DB.mutations.disableAllMods(game);
      },
      handleEnableMod: (id: number, enabled: boolean) => {
        DB.mutations.enableMod(id, enabled);
      },
      handleDeleteMod: (id: number) => {
        DB.mutations.deleteMod(id);
      },
      handleEnableTexture: (id: number, enabled: boolean) => {
        DB.mutations.enableTexture(id, enabled);
      },
      handleDeleteTexture: (id: number) => {
        DB.mutations.deleteTexture(id);
      },
      handleSplitTexture: (id: number) => {
        DB.mutations.splitTexture(id);
      },
    },
  };
};

type GameScreenState = {
  filterState: FilterState;
  multiSelectState: MultiSelectState;
  elements: string[];
  events: {
    handleUnselectAll: () => void;
    handleEnableMod: (id: number, enabled: boolean) => void;
    handleDeleteMod: (id: number) => void;
    handleEnableTexture: (id: number, enabled: boolean) => void;
    handleDeleteTexture: (id: number) => void;
    handleSplitTexture: (id: number) => void;
  };
};

function GameScreen(props: { dataApi: DataApi; game: number }) {
  const navigate = useCrossfadeNavigate();

  const setDialog = useDialogStore(useShallow((s) => s.setDialog));

  const state = useGameScreenPresenter(props.dataApi, props.game);
  const { grid, toggle } = useGrid();

  return (
    <div className="flex w-full flex-col" key={props.game}>
      <div className="sticky top-0 z-10 me-2 w-full p-2 backdrop-blur-md">
        {state.multiSelectState.enabled ? (
          <MultiSelectTopBar
            addTag={() =>
              setDialog({
                type: "add_tag_multi",
                selectedChars: state.multiSelectState.selected.map(
                  (it) => it.characters,
                ),
                refresh: () => {},
                game: props.game,
              })
            }
            state={state.multiSelectState}
          />
        ) : (
          <GameActionsTopBar
            grid={grid}
            toggleGrid={toggle}
            state={state.filterState}
            importMod={() =>
              navigate("/import", {
                state: { game: props.game },
              })
            }
            unselectAll={state.events.handleUnselectAll}
            elements={state.elements}
            addCharacter={() =>
              setDialog({
                type: "add_character",
                game: props.game,
                elements: state.elements,
                refresh: () => {},
              })
            }
          />
        )}
      </div>
      <FloatingActionButtons dataApi={props.dataApi} />
      <CharacterGrid state={state} grid={grid} />
    </div>
  );
}

const CharacterGrid = ({
  state,
  grid,
}: {
  state: GameScreenState;
  grid: boolean;
}) => {
  const setDialog = useDialogStore(useShallow((state) => state.setDialog));
  const navigate = useCrossfadeNavigate();
  const filterState = state.filterState;

  return (
    <div
      className={cn(
        grid
          ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
          : "columns-1 sm:columns-2 lg:columns-3",
        "mx-2 mb-16 gap-4 space-y-4",
      )}
    >
      {filterState.filteredCharacters.map((c) => (
        <CharacterGridItem
          key={c.characters.id}
          cwmt={c}
          setDialog={setDialog}
          state={state}
          onView={(gbId) => navigate(`/mods/${gbId}`)}
          onEdit={(modId) => navigate(`/keymap/${modId}`)}
        />
      ))}
    </div>
  );
};

const CharacterGridItem = ({
  state,
  cwmt,
  onView,
  setDialog,
  onEdit,
}: {
  cwmt: types.CharacterWithModsAndTags;
  state: GameScreenState;
  onView: (gbId: number) => void;
  onEdit: (modId: number) => void;
  setDialog: (dialog: AppDialogType | undefined) => void;
}) => {
  const selected = useMemo(() => {
    return state.multiSelectState.selectedIds.includes(cwmt.characters.id);
  }, [state.multiSelectState.selectedIds]);

  const multiState = state.multiSelectState;

  return (
    <div className={"mb-4 break-inside-avoid"}>
      <CharacterInfoCard
        className={cn(selected ? "border-2 border-primary" : "")}
        onLongPress={() => multiState.events.setMultiSelectEnabled(true)}
        onClick={() =>
          multiState.events.toggleMultiSelected(cwmt.characters.id)
        }
        enableMod={state.events.handleEnableMod}
        cmt={cwmt}
        modDropdownMenu={(mwt) => (
          <ModActionsDropDown
            addTag={() =>
              setDialog({ type: "add_tag", mod: mwt.mod, refresh: () => {} })
            }
            onEnable={() =>
              state.events.handleEnableMod(mwt.mod.id, !mwt.mod.enabled)
            }
            onDelete={() => state.events.handleDeleteMod(mwt.mod.id)}
            onRename={() =>
              setDialog({
                type: "rename_mod",
                id: mwt.mod.id,
                refresh: () => {},
              })
            }
            onView={() => {
              if (mwt.mod.gbId !== 0) {
                onView(mwt.mod.gbId);
              }
            }}
            onKeymapEdit={() => onEdit(mwt.mod.id)}
          />
        )}
        textureDropdownMenu={(t) => (
          <TextureActionDropDown
            onEnable={() => state.events.handleEnableTexture(t.id, !t.enabled)}
            onDelete={() => state.events.handleDeleteTexture(t.id)}
            onSplit={() => state.events.handleSplitTexture(t.id)}
            onRename={() =>
              setDialog({ type: "rename_texture", id: t.id, refresh: () => {} })
            }
            onView={() => {
              if (t.gbId !== 0) {
                onView(t.gbId);
              }
            }}
          />
        )}
        enableTexture={state.events.handleEnableTexture}
      />
    </div>
  );
};

function MultiSelectTopBar({
  state,
  addTag,
}: {
  state: MultiSelectState;
  addTag: () => void;
}) {
  return (
    <div className="flex h-full flex-row items-center justify-between">
      <div className="items-bottom flex w-3/4 flex-row justify-start space-x-2">
        <Button
          variant={"destructive"}
          className="backdrop-blur-md"
          onPointerDown={() => state.events.setMultiSelectEnabled(false)}
        >
          Cancel
        </Button>
        <Button
          size={"icon"}
          variant={"secondary"}
          className="backdrop-blur-mde"
          onClick={state.events.clearMultiSelected}
        >
          <XIcon />
        </Button>
        <div className="w-fit space-y-2 space-x-2">
          {state.selected.map((mwt) => {
            return (
              <Button
                key={mwt.characters.id}
                size={"sm"}
                variant={"secondary"}
                className={
                  "break-inside-avoid rounded-full bg-primary/50 backdrop-blur-md"
                }
                onPointerDown={() => {
                  state.events.toggleMultiSelected(mwt.characters.id);
                }}
              >
                {mwt.characters.name}
              </Button>
            );
          })}
        </div>
      </div>
      <div className="flex h-full flex-row items-center">
        <Button className="mx-2 backdrop-blur-md" onClick={addTag}>
          Add tag
        </Button>
        <Button
          className="mx-2 backdrop-blur-md"
          onClick={state.events.deleteCharacters}
        >
          Delete
        </Button>
      </div>
    </div>
  );
}

function FloatingActionButtons({ dataApi }: { dataApi: DataApi }) {
  const { reload, reloading } = useGenerator(dataApi);

  const { syncing, sync } = useSync(dataApi);

  return (
    <div className="fixed end-6 bottom-4 z-10 flex -translate-y-1 flex-row">
      {!reloading ? (
        <Button
          className="mx-2 rounded-full bg-primary/30 backdrop-blur-md"
          variant={"ghost"}
          onClick={reload}
        >
          Generate
        </Button>
      ) : (
        <div className="mx-2 flex flex-row items-center justify-end gap-2 rounded-full bg-primary/30 p-2 text-sm text-muted-foreground backdrop-blur-md">
          <LoadingIcon />
          Generating...
        </div>
      )}
      {!syncing ? (
        <div>
          <Button
            className="mx-2 rounded-full bg-primary/30 backdrop-blur-md"
            variant={"ghost"}
            onClick={() => sync(SyncType.SyncRequestLocal)}
          >
            Refresh Local
          </Button>
          <Button
            className="mx-2 rounded-full bg-primary/30 backdrop-blur-md"
            variant={"ghost"}
            onClick={() => sync(SyncType.SyncRequestForceNetwork)}
          >
            Refresh
          </Button>
        </div>
      ) : (
        <>
          <div className="mx-2 flex flex-row items-center justify-end gap-2 rounded-full bg-primary/30 p-2 text-sm text-muted-foreground backdrop-blur-md">
            <LoadingIcon />
            Syncing...
          </div>
          <div className="mx-2 flex flex-row items-center justify-end gap-2 rounded-full bg-primary/30 p-2 text-sm text-muted-foreground backdrop-blur-md">
            <LoadingIcon />
            Syncing...
          </div>
        </>
      )}
    </div>
  );
}

export const LoadingIcon = () => (
  <svg
    className="h-4 w-4 animate-spin"
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);

interface CharacterFilterProps extends React.HTMLAttributes<HTMLDivElement> {
  elements: string[];
  unselectAll: () => void;
  importMod: () => void;
  addCharacter: () => void;
  grid: boolean;
  toggleGrid: () => void;
  state: FilterState;
}

const GAME_SEARCH_WIDTH_KEY = "GAME_SEARCH_WIDTH_KEY ";

function GameActionsTopBar({
  elements,
  state,
  addCharacter,
  importMod,
  unselectAll,
  grid,
  toggleGrid,
  className,
}: CharacterFilterProps) {
  const elemRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const inputWidth = elemRef.current?.clientWidth ?? 0;
    if (inputWidth > 0) {
      localStorage.setItem(GAME_SEARCH_WIDTH_KEY, `${inputWidth}`);
    }

    let pw = 0;
    try {
      pw = Number(localStorage.getItem(GAME_SEARCH_WIDTH_KEY));
    } catch {}
    if (inputRef.current && pw > 0) {
      inputRef.current.style.width = `${pw}px`;
    }
  }, [inputRef.current, elemRef.current, elements, state.searchActive]);

  return (
    <div
      className={cn(
        className,
        "flex flex-row items-center justify-between overflow-x-auto",
      )}
    >
      <div className="flex flex-row space-x-2 p-2">
        <div
          ref={elemRef}
          className={cn(
            "flex flex-row space-x-2",
            state.searchActive
              ? "animate-out fade-out hidden"
              : "animate-in fade-in visible",
          )}
        >
          {elements.map((element) => {
            return (
              <Button
                key={element}
                size={"sm"}
                variant={
                  state.selectedElements.includes(element.toLowerCase())
                    ? "secondary"
                    : "outline"
                }
                className={cn(
                  state.selectedElements.includes(element.toLowerCase())
                    ? "bg-primary/50"
                    : "bg-secondary/40",
                  "rounded-full backdrop-blur-md",
                )}
                onPointerDown={() => state.toggleElementFilter(element)}
              >
                {element}
              </Button>
            );
          })}
        </div>
        <Input
          ref={inputRef}
          value={state.query}
          onInput={(e: any) => {
            state.setQuery(e.target.value as string);
          }}
          placeholder="Search..."
          className={cn(
            !state.searchActive
              ? "animate-out fade-out hidden"
              : "animate-in fade-in visible",
          )}
        ></Input>
        <Button
          size={"icon"}
          variant={"outline"}
          className={"rounded-full bg-secondary/40 p-2 backdrop-blur-md"}
          onPointerDown={() => {
            state.toggleSearchActive();
            state.setQuery("");
          }}
        >
          {state.searchActive ? <XIcon /> : <SearchIcon />}
        </Button>
      </div>
      <div className="flex flex-row pe-2">
        <Button
          className="mx-2 border-0 backdrop-blur-md"
          onPointerDown={addCharacter}
        >
          Add Character
        </Button>
        <Button
          className="mx-2 border-0 backdrop-blur-md"
          onPointerDown={importMod}
        >
          Import Mod
        </Button>
        <Button
          className="mx-2 border-0 backdrop-blur-md"
          onPointerDown={unselectAll}
        >
          Unselect All
        </Button>
        <Button
          className={cn(
            state.availableOnly ? "bg-primary/50" : "bg-secondary/20",
            "mx-2 rounded-full border-0 backdrop-blur-md",
          )}
          variant={state.availableOnly ? "secondary" : "outline"}
          onPointerDown={() => state.setAvailableOnly(!state.availableOnly)}
        >
          Mods available
        </Button>
        <Button
          className={cn(
            state.onlyCustom ? "bg-primary/50" : "bg-secondary/20",
            "mx-2 rounded-full border-0 backdrop-blur-md",
          )}
          variant={state.onlyCustom ? "secondary" : "outline"}
          onPointerDown={() => state.setOnlyCustom(!state.onlyCustom)}
        >
          Custom only
        </Button>
        <Button
          className={cn(
            grid ? "bg-primary/50" : "bg-secondary/20",
            "mx-2 rounded-full border-0 backdrop-blur-md",
          )}
          size={"icon"}
          variant={grid ? "secondary" : "outline"}
          onPointerDown={toggleGrid}
        >
          {grid ? <GridIcon /> : <Columns3Icon />}
        </Button>
      </div>
    </div>
  );
}

export default GameScreen;
