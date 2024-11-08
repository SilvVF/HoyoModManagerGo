import { useEffect, useMemo, useState } from "react";
import { DataApi, Game } from "../data/dataapi";
import { syncCharacters, SyncType } from "../data/sync";
import { cn, Pair, useStateProducer } from "../lib/utils";
import { types } from "wailsjs/go/models";
import { Reload } from "../../wailsjs/go/core/Generator";
import * as Downloader from "../../wailsjs/go/core/Downloader";
import {
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
  modsAvailablePref,
  usePrefrenceAsState,
  wuwaElementPref,
  zzzElementPref,
} from "@/data/prefs";
import { useDownloadStore } from "@/state/downloadStore";
import { useShallow } from "zustand/shallow";
import { CharacterInfoCard } from "@/components/CharacterInfoCard";
import { usePlaylistStore } from "@/state/playlistStore";

export type DialogType =
  | "rename_mod"
  | "create_tag"
  | "rename_tag"
  | "rename_texture";
export type GameDialog = Pair<DialogType, number>;

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
      return genshinElementPref;
  }
};

function GameScreen(props: { dataApi: DataApi; game: number }) {
  const navigate = useNavigate();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const updates = usePlaylistStore(useShallow((state) => state.updates));
  const [available, setAvailableOnly] = usePrefrenceAsState(modsAvailablePref);

  const [dialog, setDialog] = useState<GameDialog | undefined>(undefined);

  const [selectedElements, setSelectedElements] = usePrefrenceAsState(
    getElementPref(props.game)
  );
  const running = useDownloadStore(useShallow((state) => state.running));

  const refreshCharacters = () => setRefreshTrigger((prev) => prev + 1);

  useEffect(() => {
    refreshCharacters();
  }, [running, updates]);

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
      return [];
    }
  }, [characters, selectedElements, available]);

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
    DisableAllModsByGame(props.game).then(refreshCharacters)
  }

  return (
    <div className="flex flex-col w-full" key={props.game}>
      <div className="sticky top-0 z-10 backdrop-blur-md">
        <CharacterFilters
          className={`relative w-full`}
          unselectAll={disableAllMods}
          elements={elements}
          selectedElements={selectedElements ?? []}
          available={available ?? false}
          toggleElement={onElementSelected}
          toggleAvailable={setAvailableOnly}
        />
      </div>
      <OverlayOptions
        dataApi={props.dataApi}
        dialog={dialog}
        setDialog={setDialog}
        refreshCharacters={refreshCharacters}
      />
      <div className="grid lg:grid-cols-3 md:grid-cols-2 sm:grid-cols-1">
        {filteredCharacters.map((c) => (
          <div className="col-span-1">
            <CharacterInfoCard
              key={c.characters.id}
              enableMod={enableMod}
              cmt={c}
              deleteMod={deleteMod}
              viewMod={(gbId) => navigate(`/mods/${gbId}`)}
              setDialog={(d) => setDialog(d)}
              onEditKeymap={(modId) => navigate(`/keymap/${modId}`)}
              enableTexture={enableTexture}
              deleteTexture={deleteTexture}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function OverlayOptions({
  dialog,
  dataApi,
  setDialog,
  refreshCharacters,
}: {
  dataApi: DataApi;
  dialog: GameDialog | undefined;
  setDialog: (dialgo: GameDialog | undefined) => void;
  refreshCharacters: () => void;
}) {
  const [reloading, setReloading] = useState(false);
  const [syncing, setSyncing] = useState(false);

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
        onSuccess: () => {},
      },
      rename_tag: {
        title: "Rename tag",
        description: "Rename the current tag",
        onSuccess: () => {},
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

  const sync = (type: SyncType) => {
    setSyncing(true);
    syncCharacters(dataApi, type)
      .then(refreshCharacters)
      .finally(() => setSyncing(false));
  };

  const reload = async () => {
    setReloading(true)
    Reload(await dataApi.game())
    .finally(() => setReloading(false))
    .catch()
  }

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

interface CharacterFilterProps extends React.HTMLAttributes<HTMLDivElement> {
  elements: string[];
  selectedElements: string[];
  available: boolean;
  toggleAvailable: (change: boolean) => void;
  toggleElement: (element: string) => void;
  unselectAll: () => void;
}

function CharacterFilters({
  elements,
  unselectAll,
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
      <div className="flex flex-row pe-2">
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

export default GameScreen;
