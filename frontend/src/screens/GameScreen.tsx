import { useEffect, useMemo, useRef, useState } from "react";
import { DataApi, Game } from "../data/dataapi";
import { syncCharacters, SyncType } from "../data/sync";
import { cn, useStateProducer } from "../lib/utils";
import { types } from "wailsjs/go/models";
import * as Generator from "../../wailsjs/go/core/Generator";
import * as Downloader from "../../wailsjs/go/core/Downloader";
import {
  CreateCustomCharacter,
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
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
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
import { imageFileExtensions } from "./EditScreen";
import { DialogTrigger } from "@radix-ui/react-dialog";

type RenameDialogType =
  | "rename_mod"
  | "rename_texture";

type CustomDialogType =
  | "add_character"

interface CustomDialog {
  type: "custom",
  name: CustomDialogType
};

interface RenameDialog {
  type: "rename"
  x: RenameDialogType
  y: number
};

export type DialogType = RenameDialog | CustomDialog

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

function GameScreen(props: { dataApi: DataApi; game: number }) {
  const navigate = useNavigate();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const updates = usePlaylistStore(useShallow((state) => state.updates));
  const [available, setAvailableOnly] = usePrefrenceAsState(modsAvailablePref);

  const [dialog, setDialog] = useState<DialogType | undefined>(undefined);

  const [selectedElements, setSelectedElements] = usePrefrenceAsState(
    useMemo(() => getElementPref(props.game), [props.game])
  );
  const [onlyCustom, setOnlyCustom] = usePrefrenceAsState(
    useMemo(() => inMemroyPerf<boolean>(false, "only_custom"), [])
  )

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
      rename_texture: {
        title: "Rename Texture",
        description:
          "rename the current texture (this will change the folder name in files)",
        onSuccess: (id: number, name: string) => {
          RenameTexture(id, name).then(refreshCharacters);
        },
      },
    };
  }, [refreshCharacters]);

  const Settings = useMemo(() => {
    if (dialog === undefined || dialog.type !== "rename") return undefined;
    const renameDialog: RenameDialog = dialog as any
    const curr = dialogSettings[renameDialog.x];
    return (
      <NameDialogContent
        title={curr.title}
        description={curr.description}
        input={inputValue}
        onInputChange={handleChange}
        onSuccess={() => curr.onSuccess(renameDialog.y, inputValue)}
      />
    );
  }, [dialog, dialogSettings]);

  return (
    <div className="flex flex-col w-full" key={props.game}>
      <div className="sticky top-0 z-10 backdrop-blur-md">
        <CharacterFilters
          className={`relative w-full`}
          unselectAll={disableAllMods}
          elements={elements}
          selectedElements={selectedElements ?? []}
          onlyCustom={onlyCustom ?? false}
          available={available ?? false}
          toggleElement={onElementSelected}
          toggleAvailable={setAvailableOnly}
          toggleCustom={() => setOnlyCustom(p => !p)}
          addCharacter={() => setDialog({ type: "custom", name: "add_character" })}
          importMod={() => navigate("/import", {
            state: { game: props.game }
          })}
        />
      </div>
      <OverlayOptions
        elements={elements}
        dataApi={props.dataApi}
        dialog={dialog}
        setDialog={setDialog}
        refreshCharacters={refreshCharacters}
      />
      <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4 mb-16 mx-2">
        {filteredCharacters.map((c) => (
          <div key={c.characters.id} className="break-inside-avoid mb-4">
            <CharacterInfoCard
              enableMod={enableMod}
              cmt={c}
              modDropdownMenu={(mwt) => (
                <Dialog>
                  <ModActionsDropDown
                    onEnable={() => enableMod(mwt.mod.id, !mwt.mod.enabled)}
                    onDelete={() => deleteMod(mwt.mod.id)}
                    onRename={() => setDialog({ type: "rename", x: "rename_mod", y: mwt.mod.id })}
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
                    onRename={() => setDialog({ type: "rename", x: "rename_texture", y: t.id })}
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
export function NameDialog(props: {
  title: string;
  description: string;
  onSuccess: (name: string) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [inputValue, setInputValue] = useState("");
  const handleChange = (event: any) => {
    setInputValue(event.target.value);
  };

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{props.title}</DialogTitle>
          <DialogDescription>{props.description}</DialogDescription>
        </DialogHeader>
        <div className="flex items-center space-x-2">
          <div className="grid flex-1 gap-2">
            <Input
              value={inputValue}
              onChange={handleChange}
              defaultValue="Playlist"
            />
          </div>
        </div>
        <DialogFooter className="sm:justify-start">
          <DialogClose asChild>
            <Button type="button" variant="secondary">
              Cancel
            </Button>
          </DialogClose>
          <DialogClose asChild>
            <Button
              onPointerDown={() => props.onSuccess(inputValue)}
              type="button"
              variant="secondary"
            >
              Confirm
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function OverlayOptions({
  dataApi,
  dialog,
  setDialog,
  elements,
  refreshCharacters,
}: {
  dataApi: DataApi;
  dialog: DialogType | undefined;
  elements: string[];
  setDialog: (dialog: DialogType | undefined) => void;
  refreshCharacters: () => void;
}) {

  const customDialog = dialog !== undefined && dialog.type === "custom" ? dialog as CustomDialog : undefined
  const [reloading, setReloading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  // lazy way to restore the state of generating job TODO: maybe use events 
  useEffect(() => {
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

  const createCharacter = async (name: string, image: string, element: string | undefined) => {
    CreateCustomCharacter(name, image, element ?? "", await dataApi.game()).then(refreshCharacters)
  }

  return (
    <>
      <Dialog open={customDialog !== undefined} onOpenChange={() => setDialog(undefined)}>
        <DialogContent>
          <DialogTitle>
            Add a custom category
          </DialogTitle>
          <DialogDescription>
            create a custom category that will be added as a character to the db. Use this for things like npc mods or weapon mods
          </DialogDescription>
          {customDialog !== undefined
            ? <CustomDialogContent
              dialog={customDialog}
              createCharacter={createCharacter}
              elements={elements}
            />
            : undefined
          }
        </DialogContent>
      </Dialog>
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
    </>
  );
}

function CustomDialogContent(
  { dialog, elements, createCharacter }: {
    dialog: CustomDialog,
    elements: string[],
    createCharacter: (name: string, image: string, element: string | undefined) => void
  }
) {
  if (dialog.name === "add_character") {
    const CharacterAddDialog = () => {

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

    return (
      <div>
        <CharacterAddDialog />
      </div>
    )
  }
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

function CharacterFilters({
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

export function NameDialogContent(props: {
  title: string;
  description: string;
  onSuccess: () => void;
  input: string;
  onInputChange: (v: any) => void;
}) {
  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>{props.title}</DialogTitle>
        <DialogDescription>{props.description}</DialogDescription>
      </DialogHeader>
      <div className="flex items-center space-x-2">
        <div className="grid flex-1 gap-2">
          <Input
            value={props.input}
            onChange={props.onInputChange}
            defaultValue="Playlist"
          />
        </div>
      </div>
      <DialogFooter className="sm:justify-start">
        <DialogClose asChild>
          <Button type="button" variant="secondary">
            Cancel
          </Button>
        </DialogClose>
        <DialogClose asChild>
          <Button
            onPointerDown={props.onSuccess}
            type="button"
            variant="secondary"
          >
            Confirm
          </Button>
        </DialogClose>
      </DialogFooter>
    </DialogContent>
  );
}

export default GameScreen;
