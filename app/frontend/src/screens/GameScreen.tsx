import { useEffect, useMemo, useRef, useState } from "react";
import { DataApi, Game } from "../data/dataapi";
import { syncCharacters, SyncType } from "../data/sync";
import { cn, useStateProducer } from "../lib/utils";
import { types } from "wailsjs/go/models";
import * as Generator from "../../wailsjs/go/core/Generator";
import * as Downloader from "../../wailsjs/go/core/Downloader";
import {
  CreateCustomCharacter,
  DeleteCharacter,
  DisableAllModsByGame,
  EnableModById,
  EnableTextureById,
  RenameMod,
  RenameTexture,
} from "../../wailsjs/go/core/DbHelper";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { ImageIcon } from "lucide-react";
import { OpenFileDialog } from "wailsjs/go/main/App";
import { imageFileExtensions } from "@/lib/tsutils";
import { DialogTrigger } from "@radix-ui/react-dialog";
import { EventsOn } from "wailsjs/runtime/runtime";
import { NameDialogContent } from "@/components/NameDialog";

type RenameType = "mod" | "texture"

const RenameConfig: { [key in RenameType]: { title: string, description: string } } = {
  "mod": {
    title: "Rename mod",
    description: "rename the current mod (this will change the folder name in files)",
  },
  "texture": {
    title: "Rename Texture",
    description: "rename the current texture (this will change the folder name in files)",
  }
}

const DialogConfig: { [key in GameScreenDialog["type"]]: { title: string, description: string } } = {
  "rename": { // handled above
    title: "",
    description: ""
  },
  "add_character": {
    title: "Add a custom character",
    description: "Adds an additional character to the database with the selected name and image (can be a local file but path must not change)"
  }
}

type GameScreenDialog =
  | {
    type: "rename",
    rtype: RenameType,
    id: number
  }
  | {
    type: "add_character",
  }


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

const useMultiSelectState = (cwmt: types.CharacterWithModsAndTags[], refreshCharacters: () => void) => {

  const [multiSelect, setMultiSelect] = useState(false)
  const [selectedCardsUnfiltered, setSelectedCards] = useState<number[] | undefined>(undefined)

  const selectedCards = useMemo(() => {
    return selectedCardsUnfiltered?.filter(id => cwmt.any(c => c.characters.id === id) ?? [])
  }, [cwmt, selectedCardsUnfiltered])


  const deleteCharacters = () => {
    const toDelete = selectedCards?.map(id => cwmt.find(c => c.characters.id === id)!)!
    //.filter((c) => c?.characters.custom)!

    Promise.all(
      toDelete.map((c) => DeleteCharacter(c.characters.name, c.characters.id, c.characters.game))
    ).finally(refreshCharacters)
  }

  const multiSelectedCharacters = useMemo(() => {
    return cwmt?.filter((it) => selectedCards?.includes(it.characters.id)) ?? []
  }, [cwmt, selectedCards])


  return {
    mutliSelectedIds: selectedCards ?? [],
    multiSelectEnabled: multiSelect,
    multiSelectedCharacters: multiSelectedCharacters,
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
        setSelectedCards(p => [...p ?? [], id])
      } else {
        setSelectedCards(p => p?.filter(cid => cid !== id))
      }
    },
    deleteCharacters: deleteCharacters
  }
}

const useFilterState = (characters: types.CharacterWithModsAndTags[], game: number) => {

  const [selectedElements, setSelectedElements] = usePrefrenceAsState(
    useMemo(() => getElementPref(game), [game])
  );

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
        .filter((cwmt) => (onlyCustom ? cwmt.characters.custom : true));
    } else {
      return [];
    }
  }, [characters, selectedElements, available, onlyCustom]);

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
    availableOnly: available ?? false,
    setAvailableOnly: setAvailableOnly,
    filteredCharacters: filteredCharacters,
    selectedElements: selectedElements,
    toggleElementFilter: onElementSelected
  }
}

function GameScreen(props: { dataApi: DataApi; game: number }) {
  const navigate = useNavigate();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const updates = usePlaylistStore(useShallow((state) => state.updates));

  const [dialog, setDialog] = useState<GameScreenDialog | undefined>(undefined);


  const running = useDownloadStore(useShallow((state) => state.running));
  const refreshCharacters = () => setRefreshTrigger((prev) => prev + 1);

  const elements = useStateProducer<string[]>(
    [],
    async (update) => {
      props.dataApi.elements().then((elements) => update(elements));
    },
    [props.dataApi]
  );

  const characters = useStateProducer<types.CharacterWithModsAndTags[]>(
    [],
    async (update) => {
      update(await props.dataApi.charactersWithModsAndTags());
    },
    [props.dataApi, running, updates, refreshTrigger]
  );

  const {
    filteredCharacters,
    availableOnly,
    setAvailableOnly,
    onlyCustom,
    setOnlyCustom,
    selectedElements,
    toggleElementFilter
  } = useFilterState(characters, props.game)

  const {
    multiSelectEnabled,
    setMultiSelectEnabled,
    toggleMultiSelected,
    multiSelectedCharacters,
    mutliSelectedIds,
    deleteCharacters
  } = useMultiSelectState(characters, refreshCharacters)

  const deleteMod = async (id: number) => {
    Downloader.Delete(id).then(refreshCharacters);
  };

  const enableMod = async (id: number, enabled: boolean) => {
    EnableModById(enabled, id).then(refreshCharacters);
  };

  const deleteTexture = async (id: number) => {
    Downloader.DeleteTexture(id).then(refreshCharacters);
  };

  const enableTexture = async (id: number, enabled: boolean) => {
    EnableTextureById(enabled, id).then(refreshCharacters);
  };

  const disableAllMods = async () => {
    DisableAllModsByGame(props.game).then(refreshCharacters);
  };

  const [inputValue, setInputValue] = useState("");
  const handleChange = (event: any) => {
    setInputValue(event.target.value);
  };

  const Settings = useMemo(() => {
    if (dialog?.type !== "rename") {
      return undefined
    }

    const conf = RenameConfig[dialog.rtype]

    return (
      <NameDialogContent
        title={conf.title}
        description={conf.description}
        input={inputValue}
        onInputChange={handleChange}
        onSuccess={() => {
          switch (dialog.rtype) {
            case "mod":
              RenameMod(dialog.id, inputValue).then(refreshCharacters)
              break;
            case "texture":
              RenameTexture(dialog.id, inputValue).then(refreshCharacters)
              break;
          }
          setInputValue("")
        }}
      />
    );
  }, [dialog]);


  return (
    <div className="flex flex-col w-full" key={props.game}>
      <div className="sticky top-0 z-10 backdrop-blur-md">
        {multiSelectEnabled ? (
          <MultiSelectTopBar
            deleteCharacters={deleteCharacters}
            multiSelectedCharacters={multiSelectedCharacters}
            toggleMultiSelected={toggleMultiSelected}
            setMultiSelectEnabled={setMultiSelectEnabled} />
        ) : (
          <GameActionsTopBar
            className="relative w-full"
            unselectAll={disableAllMods}
            elements={elements}
            selectedElements={selectedElements ?? []}
            onlyCustom={onlyCustom}
            available={availableOnly}
            toggleElement={toggleElementFilter}
            toggleAvailable={setAvailableOnly}
            toggleCustom={() => setOnlyCustom(p => !p)}
            addCharacter={() => setDialog({ type: "add_character" })}
            importMod={() => navigate("/import", {
              state: { game: props.game }
            })}
          />
        )}
      </div>
      <GameScreenDialogHost
        dataApi={props.dataApi}
        refreshCharacters={refreshCharacters}
        elements={elements}
        dialog={dialog}
        setDialog={setDialog}
      />
      <FloatingActionButtons
        elements={elements}
        dataApi={props.dataApi}
        dialog={dialog}
        setDialog={setDialog}
        refreshCharacters={refreshCharacters}
      />
      <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4 mb-16 mx-2">
        {filteredCharacters.map((c) => (
          <div
            key={c.characters.id}
            className={"break-inside-avoid mb-4"}>
            <CharacterInfoCard
              className={cn(mutliSelectedIds.includes(c.characters.id) ? "border-2 border-primary" : "")}
              onLongPress={() => setMultiSelectEnabled(true)}
              onClick={() => toggleMultiSelected(c.characters.id)}
              enableMod={enableMod}
              cmt={c}
              modDropdownMenu={(mwt) => (
                <Dialog>
                  <ModActionsDropDown
                    onEnable={() => enableMod(mwt.mod.id, !mwt.mod.enabled)}
                    onDelete={() => deleteMod(mwt.mod.id)}
                    onRename={() => setDialog({ type: "rename", rtype: "mod", id: mwt.mod.id })}
                    onView={() => {
                      if (mwt.mod.gbId !== 0) {
                        navigate(`/mods/${mwt.mod.gbId}`);
                      }
                    }}
                    onKeymapEdit={() => navigate(`/keymap/${mwt.mod.id}`)}
                  />
                  {Settings}
                </Dialog>
              )}
              textureDropdownMenu={(t) => (
                <Dialog
                  modal={true}
                  open={Settings !== undefined}
                  onOpenChange={() => setDialog(undefined)}
                >
                  <TextureActionDropDown
                    onEnable={() => enableTexture(t.id, !t.enabled)}
                    onDelete={() => deleteTexture(t.id)}
                    onRename={() => setDialog({ type: "rename", rtype: "texture", id: t.id })}
                    onView={() => {
                      if (t.gbId !== 0) {
                        navigate(`/mods/${t.gbId}`);
                      }
                    }}
                  />
                  {Settings}
                </Dialog>
              )}
              enableTexture={enableTexture}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function MultiSelectTopBar(
  {
    deleteCharacters,
    setMultiSelectEnabled,
    multiSelectedCharacters,
    toggleMultiSelected
  }: {
    deleteCharacters: () => void,
    setMultiSelectEnabled: (enabled: boolean) => void,
    multiSelectedCharacters: types.CharacterWithModsAndTags[],
    toggleMultiSelected: (id: number) => void
  }
) {

  return (
    <div className="flex flex-row">
      <Button
        className="mx-2 backdrop-blur-md border-0"
        onClick={deleteCharacters}
      >
        Delete
      </Button>
      <Button
        className="mx-2 backdrop-blur-md border-0"
        onPointerDown={() => setMultiSelectEnabled(false)}
      >
        Cancel
      </Button>
      <div className="flex flex-row space-x-2 p-2">
        {multiSelectedCharacters.map((mwt) => {
          return (
            <Button
              key={mwt.characters.id}
              size={"sm"}
              variant={"secondary"}
              className={"bg-primary/50 rounded-full backdrop-blur-md border-0"}
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
  )
}

function GameScreenDialogHost({
  dataApi, dialog, refreshCharacters, setDialog, elements
}: {
  dataApi: DataApi,
  dialog: GameScreenDialog | undefined,
  refreshCharacters: () => void,
  setDialog: (dialog: GameScreenDialog | undefined) => void,
  elements: string[]
}) {

  const createCharacter = async (name: string, image: string, element: string | undefined) => {
    CreateCustomCharacter(name, image, element ?? "", await dataApi.game()).then(refreshCharacters)
  }


  if (dialog === undefined) {
    return undefined
  }

  const config = DialogConfig[dialog.type]

  return (
    <Dialog open={dialog !== undefined} onOpenChange={() => setDialog(undefined)}>
      <DialogContent>
        <DialogTitle>
          {config.title}
        </DialogTitle>
        <DialogDescription>
          {config.description}
        </DialogDescription>
        <CustomDialogContent
          dialog={dialog}
          createCharacter={createCharacter}
          elements={elements}
        />
      </DialogContent>
    </Dialog>
  )
}

function FloatingActionButtons({
  dataApi,
  refreshCharacters,
}: {
  dataApi: DataApi;
  dialog: GameScreenDialog | undefined;
  elements: string[];
  setDialog: (dialog: GameScreenDialog | undefined) => void;
  refreshCharacters: () => void;
}) {

  const [reloading, setReloading] = useState(false);
  const [syncing, setSyncing] = useState(false);


  // lazy way to restore the state of generating job TODO: maybe use events 
  useEffect(() => {
    const handleGenStarted = () => {
      dataApi.game().then((game) => {
        Generator.IsRunning(game)
          .then((reloading) => {
            setReloading(reloading)
            if (reloading) {
              Generator
                .AwaitCurrentJob(game)
                .finally(() => setReloading(false))
            }
          })
      })
    }

    handleGenStarted()
    const cancel = EventsOn("gen_started", () => {
      handleGenStarted()
    })

    return () => {
      cancel()
    }
  }, [])

  const sync = (type: SyncType) => {
    setSyncing(true);
    syncCharacters(dataApi, type)
      .then(refreshCharacters)
      .finally(() => setSyncing(false));
  };

  const reload = async () => {
    setReloading(true);
    Generator.Reload(await dataApi.game())
      .finally(() => setReloading(false))
      .catch();
  };

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

interface DialogContentProps {
  dialog: GameScreenDialog,
  elements: string[],
  createCharacter: (name: string, image: string, element: string | undefined) => void
}

function CustomDialogContent(
  props: DialogContentProps
) {
  switch (props.dialog.type) {
    case "rename":
      return undefined
    case "add_character":
      return <AddCharacterDialog {...props} />
  }
}

function AddCharacterDialog({ createCharacter, elements }: DialogContentProps) {
  const imageInput = useRef<HTMLInputElement>(null)
  const nameInput = useRef<HTMLInputElement>(null)
  const [selectedElement, setSelectedElement] = useState<string | undefined>(undefined)


  const onCreateCategory = () => {
    const image = imageInput.current?.value
    const name = nameInput.current?.value

    if (image && name) {
      createCharacter(name, image, selectedElement)
    }
  }

  const openImageFilePicker = () => {
    OpenFileDialog("select a category image", imageFileExtensions).then((file) => {
      if (imageInput.current) {
        imageInput.current.value = file
      }
    })
  }

  return (
    <div className="flex flex-col space-y-1 w-full overflow-clip">
      <text>Name</text>
      <Input ref={nameInput} type="text" className="w-full" />
      <text>Image</text>
      <div className="flex flex-row space-x-2">
        <Input ref={imageInput} type="text" className="w-full" />
        <Button onPointerDown={openImageFilePicker} size={"icon"}>
          <ImageIcon />
        </Button>
      </div>
      <div className="grid grid-cols-4 space-x-2 space-y-2 p-2">
        {elements.map((element) => {
          return (
            <Button
              key={element}
              size={"sm"}
              variant={
                selectedElement === element
                  ? "secondary"
                  : "outline"
              }
              className={cn(
                selectedElement === element
                  ? "bg-primary/50 hover:bg-primary/50"
                  : "bg-secondary/40",
                "rounded-full backdrNop-blur-md border-0"
              )}
              onPointerDown={() => setSelectedElement(e => element === e ? undefined : element)}
            >
              {element}
            </Button>
          );
        })}
      </div>
      <DialogTrigger>
        <Button
          className="w-full"
          onPointerDown={onCreateCategory}>
          Create
        </Button>
      </DialogTrigger>
    </div>
  )
}

interface CharacterFilterProps extends React.HTMLAttributes<HTMLDivElement> {
  elements: string[];
  onlyCustom: boolean;
  selectedElements: string[];
  available: boolean;
  toggleAvailable: (change: boolean) => void;
  toggleElement: (element: string) => void;
  toggleCustom: () => void;
  unselectAll: () => void;
  importMod: () => void;
  addCharacter: () => void;
}

function GameActionsTopBar({
  elements,
  unselectAll,
  onlyCustom,
  selectedElements,
  available,
  toggleAvailable,
  toggleElement,
  toggleCustom,
  importMod,
  addCharacter,
  className,
}: CharacterFilterProps) {
  return (
    <div
      className={cn(
        className,
        "flex flex-row items-center justify-between p-2 me-2 overflow-x-auto"
      )}
    >
      <div className="flex flex-row space-x-2 p-2">
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
                "rounded-full backdrop-blur-md border-0"
              )}
              onPointerDown={() => toggleElement(element)}
            >
              {element}
            </Button>
          );
        })}
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
            available ? "bg-primary/50" : "bg-secondary/20",
            "mx-2 rounded-full backdrop-blur-md border-0"
          )}
          variant={available ? "secondary" : "outline"}
          onPointerDown={() => toggleAvailable(!available)}
        >
          Mods available
        </Button>
        <Button
          className={cn(
            onlyCustom ? "bg-primary/50" : "bg-secondary/20",
            "mx-2 rounded-full backdrop-blur-md border-0"
          )}
          variant={available ? "secondary" : "outline"}
          onPointerDown={toggleCustom}
        >
          Custom only
        </Button>
      </div>
    </div>
  );
}

export default GameScreen;
