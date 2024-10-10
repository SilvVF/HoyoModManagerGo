import { useEffect, useMemo, useState } from "react";
import { DataApi } from "../data/dataapi";
import { syncCharacters } from "../data/sync";
import { cn, useStateProducer } from "../lib/utils";
import { types } from "wailsjs/go/models";
import { Reload } from "../../wailsjs/go/core/Generator";
import * as Downloader from "../../wailsjs/go/core/Downloader";
import { EnableModById, RenameMod } from "../../wailsjs/go/core/DbHelper";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CheckCheckIcon, PencilIcon, Trash, ViewIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { genshinElementPref, GoPref, honkaiElementPref, modsAvailablePref, usePrefrenceAsState, wuwaElementPref, zzzElementPref } from "@/data/prefs";

type DialogType = "rename_mod" | "create_tag" | "rename_tag"
type GameDialog = Pair<DialogType, number>
type Pair<T, V> = { x: T, y: V }

function GameScreen(props: { dataApi: DataApi, game: number }) {

  const navigate = useNavigate();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [available, setAvailableOnly] = usePrefrenceAsState(modsAvailablePref);

  const [dialog, setDialog] = useState<GameDialog | undefined>(undefined)
  
  const getElementPref = (): GoPref<string[]> => {
    switch(props.game) {
      case 1: return genshinElementPref;
      case 2: return honkaiElementPref;
      case 3: return zzzElementPref;
      case 4: return wuwaElementPref;
      default: return genshinElementPref;
    }
  }
  const [selectedElements, setSelectedElements] = usePrefrenceAsState(getElementPref())

  useEffect(() => {
    syncCharacters(props.dataApi, 0);
  }, [props.dataApi]);

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
    [props.dataApi, refreshTrigger]
  );

  const filteredCharacters = useMemo(() => {
    if (selectedElements !== undefined && available !== undefined) {
      return characters
      .filter(
        (cwmt) =>
          selectedElements.includes(cwmt.characters.element.toLowerCase()) ||
          selectedElements.isEmpty()
      )
      .filter((cwmt) => (available ? !cwmt.modWithTags.isEmpty() : true));
    } else {
      return []
    }
  }, [characters, selectedElements, available]);


  const refreshCharacters = () => setRefreshTrigger((prev) => prev + 1);

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
    Downloader.Delete(id).then(() => setRefreshTrigger((prev) => prev + 1));
  };

  const enableMod = async (id: number, enabled: boolean) => {
    EnableModById(enabled, id).then(refreshCharacters);
  };

  const dialogSettings = useMemo(() => {
    return {
      "rename_mod": {
        title: "Rename mod",
        description: "rename the current mod (this will change the folder name in files)",
        onSuccess: (id: number, name: string) => {
            RenameMod(id, name).then(refreshCharacters)
        }
      },
      "create_tag": {
        title: "Create tag",
        description: "create a tag for the mod",
        onSuccess: () => {}
      },
      "rename_tag": {
       title: "Rename tag",
       description: "Rename the current tag",
       onSuccess: () => {}
      }
    }
  }, [])

  const settings = dialog !== undefined ? dialogSettings[dialog.x] : undefined

  return (
    <div className="flex flex-col w-full" key={props.game}>
        <div className="sticky top-0 z-10 backdrop-blur-md">
            <CharacterFilters
                className={`relative w-full`} 
                elements={elements}
                selectedElements={selectedElements ?? []}
                available={available ?? false}
                toggleElement={onElementSelected}
                toggleAvailable={setAvailableOnly}
            />
        </div>
      <div className="absolute bottom-4 -translate-y-1/2 end-12 flex flex-row z-10">
        <NameDialog
            title={settings?.title ?? ""}
            description={settings?.description ?? ""}
            open={dialog !== undefined} 
            onOpenChange={() => setDialog(undefined)} 
            onSuccess={(n) => settings!!.onSuccess(dialog!!.y, n) } 
          />
        <Button
            className="mx-2 rounded-full backdrop-blur-md bg-primary/20"
            variant={'ghost'}
            onClick={() => (async() => Reload(await props.dataApi.game()).catch())()}
          >
            Generate
          </Button>
          <Button
            className="mx-2 rounded-full backdrop-blur-md bg-primary/20"
            variant={'ghost'}
            onClick={() =>
              syncCharacters(props.dataApi, 1).then(refreshCharacters)
            }
          >
            Refresh Local
          </Button>
          <Button
            className="mx-2 rounded-full backdrop-blur-md bg-primary/20"
            variant={'ghost'}
            onClick={() =>
              syncCharacters(props.dataApi, 2).then(refreshCharacters)
            }
          >
            Refresh
          </Button>
      </div>
      <div className="grid lg:grid-cols-3 md:grid-cols-2 sm:grid-cols-1">
        {filteredCharacters.map((c) => (
          <div className="col-span-1">
            <CharacterBox
              key={c.characters.id}
              enableMod={enableMod}
              cmt={c}
              deleteMod={deleteMod}
              viewMod={(gbId) => navigate(`/mods/${gbId}`)}
              setDialog={(d) => setDialog(d)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

interface CharacterFilterProps extends React.HTMLAttributes<HTMLDivElement> {
  elements: string[];
  selectedElements: string[];
  available: boolean;
  toggleAvailable: (change: boolean) => void;
  toggleElement: (element: string) => void;
}

function CharacterFilters({
  elements,
  selectedElements,
  available,
  toggleAvailable,
  toggleElement,
  className,
}: CharacterFilterProps) {
  return (
    <div
      className={cn(
        className,
        "flex flex-row items-center justify-between p-2 me-2"
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
                  : "bg-secondary/20",
                "rounded-full backdrop-blur-md border-0"
              )}
              onPointerDown={() => toggleElement(element)}
            >
              {element}
            </Button>
          );
        })}
      </div>
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
    </div>
  );
}

export function NameDialog(
  props: { 
    title: string
    description: string
    onSuccess: (name: string) => void,
    open: boolean
    onOpenChange: (open: boolean) => void
  }
) {
  const [inputValue, setInputValue] = useState("");
  const handleChange = (event: any) => {
    setInputValue(event.target.value);
  };

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{props.title}</DialogTitle>
          <DialogDescription>
            {props.description}
          </DialogDescription>
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


export function ModActionsDropDown(props: {
  onDelete: () => void;
  onRename: () => void;
  onView: () => void;
  onEnable: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="col-span-1" variant={"ghost"} size="icon">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <circle cx="12" cy="12" r="1" />
            <circle cx="12" cy="5" r="1" />
            <circle cx="12" cy="19" r="1" />
          </svg>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={props.onDelete}>
          <Trash className="mr-2 h-4 w-4" />
          <span className="w-full">Delete</span>
          <DropdownMenuShortcut>⇧d</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={props.onRename}>
          <PencilIcon className="mr-2 h-4 w-4" />
          <span className="w-full">Rename</span>
          <DropdownMenuShortcut>⇧r</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={props.onView}>
          <ViewIcon className="mr-2 h-4 w-4" />
          <span className="w-full">View</span>
          <DropdownMenuShortcut>⇧v</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={props.onEnable}>
          <CheckCheckIcon className="mr-2 h-4 w-4" />
          <span className="w-full">Enable</span>
          <DropdownMenuShortcut>⇧e</DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function CharacterBox({
  cmt,
  enableMod,
  deleteMod,
  viewMod,
  setDialog
}: {
  cmt: types.CharacterWithModsAndTags;
  enableMod: (id: number, enabled: boolean) => void;
  deleteMod: (id: number) => void;
  viewMod: (gbId: number) => void;
  setDialog: (d: GameDialog) => void;
}) {
  const character: types.Character = cmt.characters;

  return (
    <Card className="m-2">
      <div className="flex flex-row  m-2">
        <div className="flex flex-col items-start">
          <img src={character.avatarUrl}></img>
          <b className="text-lg p-2">{character.name}</b>
        </div>
        <ScrollArea className="max-h-[300px] w-full">
          {cmt.modWithTags.map((mwt) => {
            return (
              <div
                key={mwt.mod.id}
                className="grid grid-cols-5 overflow-hidden items-center"
              >
                <b className="col-span-3 w-full text-sm my-1 overflow-ellipsis overflow-x-hidden pe-1">
                  {mwt.mod.filename}
                </b>
                <Switch
                  className="col-span-1 my-1"
                  checked={mwt.mod.enabled}
                  onCheckedChange={() =>
                    enableMod(mwt.mod.id, !mwt.mod.enabled)
                  }
                />
                <ModActionsDropDown
                  onEnable={() => enableMod(mwt.mod.id, !mwt.mod.enabled)}
                  onDelete={() => deleteMod(mwt.mod.id)}
                  onRename={() => setDialog( { x: "rename_mod", y: mwt.mod.id } )}
                  onView={() => {
                    if (mwt.mod.gbId !== 0) {
                      viewMod(mwt.mod.gbId);
                    }
                  }}
                />
              </div>
            );
          })}
        </ScrollArea>
      </div>
    </Card>
  );
}

export default GameScreen;
