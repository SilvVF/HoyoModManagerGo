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
  inMemroyPerf,
  modsAvailablePref,
  usePrefrenceAsState,
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
import { EventsOn, LogDebug } from "wailsjs/runtime/runtime";
import useCrossfadeNavigate from "@/hooks/useCrossfadeNavigate";
import { useDialogStore } from "@/components/appdialog";
import DB from "@/data/database";
import { useGenerator } from "@/data/generator";

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
      return inMemroyPerf<string[]>([], "game" + game + "_element_pref");
  }
};

const useMultiSelectState = (cwmt: types.CharacterWithModsAndTags[]) => {

  const [multiSelect, setMultiSelect] = useState(false)
  const [selectedCardsUnfiltered, setSelectedCards] = useState<number[] | undefined>(undefined)

  const selectedCards = useMemo(() => {
    return selectedCardsUnfiltered?.filter(id => cwmt.any(c => c.characters.id === id) ?? [])
  }, [cwmt, selectedCardsUnfiltered])


  const deleteCharacters = () => {
    const toDelete = selectedCards?.map(id => cwmt.find(c => c.characters.id === id)!)!
    Promise.all(
      toDelete.map((c) => DB.deleteCharacter(
        c.characters.name,
        c.characters.id,
        c.characters.game
      )
      )
    )
  }

  const multiSelectedCharacters = useMemo(() => {
    return selectedCards?.map(id => cwmt.find(c => c.characters.id === id)!) ?? []
  }, [cwmt, selectedCards])


  return {
    mutliSelectedIds: selectedCards ?? [],
    multiSelectEnabled: multiSelect,
    multiSelectedCharacters: multiSelectedCharacters,
    clearMultiSelected: () => setSelectedCards([]),
    setMultiSelectEnabled: (enabled: boolean) => {
      if (enabled) {
        setMultiSelect(enabled)
      } else {
        setSelectedCards([])
        setMultiSelect(enabled)
      }
    },
    toggleMultiSelected: (id: number) => {

      if (!multiSelect) return

      if (selectedCardsUnfiltered?.includes(id)) {
        setSelectedCards(p => p?.filter(cid => cid !== id))
      } else {
        setSelectedCards(p => [...p ?? [], id])
      }
    },
    deleteCharacters: deleteCharacters
  }
}

const useFilterState = (characters: types.CharacterWithModsAndTags[], game: number): FilterState => {

  const [selectedElements, setSelectedElements] = usePrefrenceAsState(
    useMemo(() => getElementPref(game), [game])
  );

  const [searchActive, setSearchActive] = useState(false)
  const [query, setQuery] = useState("")

  const [available, setAvailableOnly] = usePrefrenceAsState(modsAvailablePref);

  const [onlyCustom, setOnlyCustom] = usePrefrenceAsState(
    useMemo(() => inMemroyPerf<boolean>(false, "only_custom"), [])
  )

  const filteredCharacters = useMemo(() => {
    if (selectedElements !== undefined && available !== undefined) {
      return characters
        .filter(
          (cwmt) =>
            selectedElements.includes(cwmt.characters.element.toLowerCase()) ||
            selectedElements.isEmpty()
        )
        .filter((cwmt) => (available ? !cwmt.modWithTags.isEmpty() : true))
        .filter((cwmt) => (onlyCustom ? cwmt.characters.custom : true))
        .filter((cwmt) => (
          query.isBlank() ? true : (cwmt.characters.name.includes(query)
            || cwmt.modWithTags.any(mt => mt.mod.filename.includes(query)
              || mt.tags.any(t => t.name.includes(query))))
        ));
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
    setAvailableOnly: setAvailableOnly,
    filteredCharacters: filteredCharacters,
    selectedElements: selectedElements ?? [],
    toggleElementFilter: onElementSelected,
    searchActive: searchActive,
    setSearchActive: setSearchActive
  }
}

interface FilterState {
  onlyCustom: boolean,
  setOnlyCustom: (custom: boolean) => void,
  setQuery: (query: string) => void,
  query: string,
  availableOnly: boolean,
  setAvailableOnly: (available: boolean) => void,
  filteredCharacters: types.CharacterWithModsAndTags[],
  selectedElements: string[],
  toggleElementFilter: (element: string) => void,
  searchActive: boolean,
  setSearchActive: (active: boolean) => void,
}

const GRID_KEY = "GRID_KEY"

const useGrid = () => {
  const [grid, setGrid] = useState(localStorage.getItem(GRID_KEY) !== null)
  return {
    grid,
    toggle: () => {
      if (grid) {
        localStorage.removeItem(GRID_KEY)
        setGrid(false)
      } else {
        localStorage.setItem(GRID_KEY, "")
        setGrid(true)
      }
    }
  }
}

function GameScreen(props: { dataApi: DataApi; game: number }) {

  const navigate = useCrossfadeNavigate();
  const updates = usePlaylistStore(useShallow((state) => state.updates));

  const setDialog = useDialogStore(useShallow(s => s.setDialog))

  const running = useDownloadStore(useShallow((state) => state.running));

  const elements = useStateProducer<string[]>(
    [],
    async (update) => {
      props.dataApi.elements().then((elements) => update(elements));
    },
    [props.dataApi]
  );

  const characters = useStateProducer<types.CharacterWithModsAndTags[]>(
    [],
    async (update, onDispose) => {
      const unsubscribe = DB.onValueChangedListener(['characters', 'mods', 'tags'], async () => {
        const value = await props.dataApi.charactersWithModsAndTags()
        update(value)
      }, true)

      const cancel = EventsOn("sync", ({ game }) => {
        if (game === props.game) {
          props.dataApi.charactersWithModsAndTags().then(update)
        }
      })

      onDispose(() => {
        LogDebug("disposing character state producer")
        cancel()
        unsubscribe()
      })
    },
    [props.dataApi, running, updates]
  );

  const filterState = useFilterState(characters, props.game)

  const {
    multiSelectEnabled,
    setMultiSelectEnabled,
    toggleMultiSelected,
    multiSelectedCharacters,
    mutliSelectedIds,
    deleteCharacters,
    clearMultiSelected
  } = useMultiSelectState(characters)

  const { grid, toggle } = useGrid()

  const handleUnselectAll = () => {
    DB.disableAllMods(props.game)
  }

  const handleEnableMod = (id: number, enabled: boolean) => {
    DB.enableMod(id, enabled)
  }

  const handleDeleteMod = (id: number) => {
    DB.deleteMod(id)
  }

  const handleEnableTexture = (id: number, enabled: boolean) => {
    DB.enableTexture(id, enabled)
  }
  const handleDeleteTexture = (id: number) => {
    DB.deleteTexture(id)
  }
  const handleSplitTexture = (id: number) => {
    DB.splitTexture(id)
  }

  return (
    <div className="flex flex-col w-full" key={props.game}>
      <div className="sticky top-0 z-10 backdrop-blur-md p-2 me-2 w-full">
        {multiSelectEnabled ? (
          <MultiSelectTopBar
            addTag={() => setDialog({
              type: "add_tag_multi",
              selectedChars: multiSelectedCharacters.map((it) => it.characters),
              refresh: () => { },
              game: props.game
            })}
            clearMultiSelected={clearMultiSelected}
            deleteCharacters={deleteCharacters}
            multiSelectedCharacters={multiSelectedCharacters}
            toggleMultiSelected={toggleMultiSelected}
            setMultiSelectEnabled={setMultiSelectEnabled} />
        ) : (
          <GameActionsTopBar
            grid={grid}
            toggleGrid={toggle}
            unselectAll={handleUnselectAll}
            elements={elements}
            addCharacter={() => setDialog({ type: "add_character", game: props.game, elements: elements, refresh: () => { } })}
            importMod={() => navigate("/import", {
              state: { game: props.game }
            })}
            {...filterState}
          />
        )}
      </div>
      <FloatingActionButtons
        dataApi={props.dataApi}
      />
      <div className={cn(
        grid
          ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
          : "columns-1 sm:columns-2 lg:columns-3",
        "gap-4 space-y-4 mb-16 mx-2")}>
        {filterState.filteredCharacters.map((c) => (
          <div
            key={c.characters.id}
            className={"break-inside-avoid mb-4"}>
            <CharacterInfoCard
              className={cn(mutliSelectedIds.includes(c.characters.id) ? "border-2 border-primary" : "")}
              onLongPress={() => setMultiSelectEnabled(true)}
              onClick={() => toggleMultiSelected(c.characters.id)}
              enableMod={handleEnableMod}
              cmt={c}
              modDropdownMenu={(mwt) => (
                <ModActionsDropDown
                  addTag={() => setDialog({ type: "add_tag", mod: mwt.mod, refresh: () => { } })}
                  onEnable={() => handleEnableMod(mwt.mod.id, !mwt.mod.enabled)}
                  onDelete={() => handleDeleteMod(mwt.mod.id)}
                  onRename={() => setDialog({ type: "rename_mod", id: mwt.mod.id, refresh: () => { } })}
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
                  onEnable={() => handleEnableTexture(t.id, !t.enabled)}
                  onDelete={() => handleDeleteTexture(t.id)}
                  onSplit={() => handleSplitTexture(t.id)}
                  onRename={() => setDialog({ type: "rename_texture", id: t.id, refresh: () => { } })}
                  onView={() => {
                    if (t.gbId !== 0) {
                      navigate(`/mods/${t.gbId}`);
                    }
                  }}
                />
              )}
              enableTexture={handleEnableTexture}
            />
          </div>
        ))}
      </div>
    </div >
  );
}

function MultiSelectTopBar(
  {
    deleteCharacters,
    clearMultiSelected,
    setMultiSelectEnabled,
    multiSelectedCharacters,
    toggleMultiSelected,
    addTag,
  }: {
    deleteCharacters: () => void,
    setMultiSelectEnabled: (enabled: boolean) => void,
    multiSelectedCharacters: types.CharacterWithModsAndTags[],
    toggleMultiSelected: (id: number) => void
    clearMultiSelected: () => void
    addTag: () => void,
  }
) {

  return (
    <div className="flex flex-row items-center justify-between h-full">
      <div className="flex flex-row items-bottom justify-start w-3/4 space-x-2">
        <Button
          variant={"destructive"}
          className="backdrop-blur-md"
          onPointerDown={() => setMultiSelectEnabled(false)}
        >
          Cancel
        </Button>
        <Button
          size={"icon"}
          variant={"secondary"}
          className="backdrop-blur-mde"
          onClick={clearMultiSelected}
        >
          <XIcon />
        </Button>
        <div className="space-x-2 space-y-2  w-fit">
          {multiSelectedCharacters.map((mwt) => {
            return (
              <Button
                key={mwt.characters.id}
                size={"sm"}
                variant={"secondary"}
                className={"break-inside-avoid bg-primary/50 rounded-full backdrop-blur-md"}
                onPointerDown={() => {
                  toggleMultiSelected(mwt.characters.id)
                }}
              >
                {mwt.characters.name}
              </Button>
            );
          })}
        </div>
      </div>
      <div className="flex flex-row items-center h-full">
        <Button
          className="mx-2 backdrop-blur-md"
          onClick={addTag}
        >
          Add tag
        </Button>
        <Button
          className="mx-2 backdrop-blur-md"
          onClick={deleteCharacters}
        >
          Delete
        </Button>
      </div>
    </div>
  )
}

function FloatingActionButtons({
  dataApi
}: {
  dataApi: DataApi
}) {

  const {
    reload,
    reloading
  } = useGenerator(dataApi)

  const {
    syncing,
    sync,
  } = useSync(dataApi)

  return (
    <div className="fixed bottom-4 -translate-y-1 end-6 flex flex-row z-10">
      {!reloading ? (
        <Button
          className="mx-2 rounded-full backdrop-blur-md bg-primary/30"
          variant={"ghost"}
          onClick={reload}
        >
          Generate
        </Button>
      ) : (
        <div className="flex flex-row items-center justify-end gap-2 text-sm text-muted-foreground p-2 rounded-full backdrop-blur-md bg-primary/30 mx-2">
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
          Generating...
        </div>
      )}
      {!syncing ? (
        <div>
          <Button
            className="mx-2 rounded-full backdrop-blur-md bg-primary/30"
            variant={"ghost"}
            onClick={() => sync(SyncType.SyncRequestLocal)}
          >
            Refresh Local
          </Button>
          <Button
            className="mx-2 rounded-full backdrop-blur-md bg-primary/30"
            variant={"ghost"}
            onClick={() => sync(SyncType.SyncRequestForceNetwork)}
          >
            Refresh
          </Button>
        </div>
      ) : (
        <>
          <div className="flex flex-row items-center justify-end gap-2 text-sm text-muted-foreground p-2 rounded-full backdrop-blur-md bg-primary/30 mx-2">
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
            Syncing...
          </div>
          <div className="flex flex-row items-center justify-end gap-2 text-sm text-muted-foreground p-2 rounded-full backdrop-blur-md bg-primary/30 mx-2">
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
            Syncing...
          </div>
        </>
      )}
    </div>
  );
}

interface CharacterFilterProps extends React.HTMLAttributes<HTMLDivElement>, FilterState {
  elements: string[];
  unselectAll: () => void;
  importMod: () => void;
  addCharacter: () => void;
  grid: boolean,
  toggleGrid: () => void;
}

var pw = 0

function GameActionsTopBar({
  elements,
  unselectAll,
  searchActive,
  setSearchActive,
  onlyCustom,
  query,
  setQuery,
  selectedElements,
  availableOnly,
  setAvailableOnly,
  toggleElementFilter,
  setOnlyCustom,
  importMod,
  addCharacter,
  grid,
  toggleGrid,
  className,
}: CharacterFilterProps) {

  const elemRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const inputWidth = elemRef.current?.clientWidth ?? 0
    if (inputWidth > 0) {
      pw = inputWidth
    }
    if (inputRef.current && pw > 0) {
      inputRef.current.style.width = `${pw}px`;
    }
  }, [inputRef.current, elemRef.current, elements, searchActive])

  return (
    <div
      className={cn(
        className,
        "flex flex-row items-center justify-between overflow-x-auto"
      )}
    >
      <div className="flex flex-row space-x-2 p-2">
        <div
          ref={elemRef}
          className={cn(
            "flex flex-row space-x-2",
            searchActive
              ? "animate-out fade-out hidden"
              : "animate-in fade-in visible")}>
          {elements.map((element) => {
            return (
              <Button
                key={element}
                size={"sm"}
                variant={
                  selectedElements.includes(element.toLowerCase())
                    ? "secondary"
                    : "outline"
                }
                className={cn(
                  selectedElements.includes(element.toLowerCase())
                    ? "bg-primary/50"
                    : "bg-secondary/40",
                  "rounded-full backdrop-blur-md",
                )}
                onPointerDown={() => toggleElementFilter(element)}
              >
                {element}
              </Button>
            );
          })}
        </div>
        <Input
          ref={inputRef}
          value={query}
          onInput={(e: any) => {
            setQuery(e.target.value as string)
          }}
          placeholder="Search..."
          className={cn(
            !searchActive
              ? "animate-out fade-out hidden"
              : "animate-in fade-in visible",
          )}>
        </Input>
        <Button
          size={"icon"}
          variant={"outline"}
          className={"bg-secondary/40 rounded-full backdrop-blur-md p-2"}
          onPointerDown={() => {
            setSearchActive(!searchActive)
            setQuery("")
          }}
        >
          {searchActive ? <XIcon /> : <SearchIcon />}
        </Button>
      </div>
      <div className="flex flex-row pe-2">
        <Button
          className="mx-2 backdrop-blur-md border-0"
          onPointerDown={addCharacter}
        >
          Add Character
        </Button>
        <Button
          className="mx-2 backdrop-blur-md border-0"
          onPointerDown={importMod}
        >
          Import Mod
        </Button>
        <Button
          className="mx-2 backdrop-blur-md border-0"
          onPointerDown={unselectAll}
        >
          Unselect All
        </Button>
        <Button
          className={cn(
            availableOnly ? "bg-primary/50" : "bg-secondary/20",
            "mx-2 rounded-full backdrop-blur-md border-0"
          )}
          variant={availableOnly ? "secondary" : "outline"}
          onPointerDown={() => setAvailableOnly(!availableOnly)}
        >
          Mods available
        </Button>
        <Button
          className={cn(
            onlyCustom ? "bg-primary/50" : "bg-secondary/20",
            "mx-2 rounded-full backdrop-blur-md border-0"
          )}
          variant={availableOnly ? "secondary" : "outline"}
          onPointerDown={() => setOnlyCustom(!onlyCustom)}
        >
          Custom only
        </Button>
        <Button
          className={cn(
            grid ? "bg-primary/50" : "bg-secondary/20",
            "mx-2 rounded-full backdrop-blur-md border-0"
          )}
          size={'icon'}
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
