import { useState } from "react";
import { cn, useStateProducer } from "@/lib/utils";
import { types } from "wailsjs/go/models";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { usePlaylistStore } from "@/state/playlistStore";
import { useShallow } from "zustand/shallow";
import { playlistGamePref, usePrefrenceAsState } from "@/data/prefs";
import { Game } from "@/data/dataapi";
import DB from "@/data/database";

const gameNameFromId = (n: number) => {
  switch (n) {
    case Game.Genshin:
      return "Genshin Impact";
    case Game.StarRail:
      return "Honkai Star Rail";
    case Game.ZZZ:
      return "Zenless Zone Zero";
    case Game.WuWa:
      return "Wuthering Waves";
    default:
      return "";
  }
};

const ids = Object.values(Game);

export function PlaylistScreen() {
  const [game, setGame] = usePrefrenceAsState(playlistGamePref);

  if (game === undefined) {
    return (
      <></>
    )
  }

  return (
    <PlaylistScreenContent
      game={game}
      setGame={setGame}
    />
  )
}

function PlaylistScreenContent({ game, setGame }: {
  game: number,
  setGame: (game: number) => void
}) {

  const playlists = usePlaylistStore(useShallow((state) => state.playlists[game]))
  const createPlaylist = usePlaylistStore((state) => state.create)
  const enablePlaylist = usePlaylistStore((state) => state.enable)
  const updates = usePlaylistStore(useShallow(state => state.updates))

  const mods = useStateProducer<types.CharacterWithModsAndTags[]>(
    [],
    async (update) => {
      DB.onValueChangedListener('all', async () => {
        const value = await DB.selectCharacterWithModsTagsAndTextures(game, "", "", "")
        update(value)
      }, true)
    },
    [game, updates]
  );

  const toggleModEnabled = (enabled: boolean, id: number) => {
    DB.enableMod(id, enabled)
  };

  const unselectAllMods = () => {
    DB.disableAllMods(game)
  };

  const togglePlaylistEnabled = (pwmt: types.PlaylistWithModsAndTags) => {
    enablePlaylist(pwmt.playlist.game, pwmt.playlist.id)
  };

  return (
    <div className="flex flex-col">
      <div className={`flex flex-row justify-between sticky top-0 z-10 backdrop-blur-md w-full`}>
        <div className="flex flex-row p-2 me-2">
          {ids.map((id) => {
            return (
              <Button
                key={id}
                size={"sm"}
                variant={
                  id === game
                    ? "secondary"
                    : "outline"
                }
                className={cn(
                  id === game
                    ? "bg-primary/50"
                    : "bg-secondary/40",
                  "rounded-full backdrop-blur-md border-0"
                )}
                onPointerDown={() => setGame(id)}
              >
                {gameNameFromId(id)}
              </Button>
            );
          })}
        </div>
        <div className="flex flex-row pe-2">
          <Button
            className="m-2 backdrop-blur-xs text-sm p-2"
            onClick={unselectAllMods}
          >
            Unselect All
          </Button>
        </div>
      </div>
      <div className="static w-full">
        <div className="grid grid-cols-2 divide-y min-w-full">
          {mods.map((cwmt) => {
            return cwmt.modWithTags.map(({ mod }) => {
              return (
                <div
                  className="col-span-1 flex flex-row justify-between items-center mx-2"
                  key={mod.id}
                >
                  <div className="flex flex-row items-center m-2">
                    <img
                      className="object-contain aspect-square rounded-full max-h-16 bg-secondary"
                      src={cwmt.characters.avatarUrl}
                    />
                    <div className="text-lg m-2 text-ellipsis">
                      {mod.filename}
                    </div>
                  </div>
                  <Switch
                    checked={mod.enabled}
                    onCheckedChange={(checked) =>
                      toggleModEnabled(checked, mod.id)
                    }
                  />
                </div>
              );
            });
          })}
          <div className="col-span-2 h-12" />
        </div>
        <div className="flex flex-row fixed bottom-4 -translate-y-1 end-6 z-10">
          <SelectPlayListDialog
            playlists={playlists}
            onSelected={(it) => togglePlaylistEnabled(it)}
          />
          <div className="w-2" />
          <CreatePlaylistDialog
            onCreate={(name) => createPlaylist(game, name)}
          ></CreatePlaylistDialog>
        </div>
      </div>
    </div>
  );
}

function SelectPlayListDialog(props: {
  onSelected: (playlist: types.PlaylistWithModsAndTags) => void;
  playlists: types.PlaylistWithModsAndTags[];
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          className="mx-2 rounded-full backdrop-blur-md bg-primary/30">Load</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Load playlist</DialogTitle>
          <DialogDescription>
            All mods from playlist will be set to enabled.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center space-x-2">
          {props.playlists.map((pwmt) => {
            return (
              <Button className="w-full" variant={"ghost"} onPointerDown={() => props.onSelected(pwmt)}>
                {pwmt.playlist.name}
              </Button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CreatePlaylistDialog(props: { onCreate: (name: string) => void }) {
  const [inputValue, setInputValue] = useState("");
  const handleChange = (event: any) => {
    setInputValue(event.target.value);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost"
          className="mx-2 rounded-full backdrop-blur-md bg-primary/30">Save</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create playlist</DialogTitle>
          <DialogDescription>
            A playlist will be created with the currently enabled mods.
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
              onPointerDown={() => props.onCreate(inputValue)}
              type="button"
              variant="secondary"
            >
              Create
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
