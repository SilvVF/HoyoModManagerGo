import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  GenshinApi,
  StarRailApi,
  WutheringWavesApi,
  ZenlessApi,
} from "@/data/dataapi";
import { cn, useStateProducer } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@radix-ui/react-dropdown-menu";
import { useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { types } from "wailsjs/go/models";
import * as App from "wailsjs/go/main/App";
import { Input } from "@/components/ui/input";
import * as Downloader from "wailsjs/go/core/Downloader";

export default function ImportScreen() {

  const location = useLocation();
  //const downloads = useDownloadStore(useShallow(state => Array.from(Object.keys(state.down))))

  const [character, setCharacter] = useState<types.Character | undefined>(
    undefined
  );

  const dataApi = useMemo(() => {
    switch (location.state["game"]) {
      case 1:
        return GenshinApi;
      case 2:
        return StarRailApi;
      case 3:
        return ZenlessApi;
      case 4:
        return WutheringWavesApi;
      default:
        return GenshinApi;
    }
  }, [location.state]);

  const characters = useStateProducer<types.Character[]>(
    [],
    async (update) => {
      if (!dataApi) {
        return;
      }
      const chars = await dataApi.characters();
      chars.sort((a, b) => {
        if (a.name == b.name) {
          return a.element > b.element ? 1 : -1;
        }
        return a.name > b.name ? 1 : -1;
      });

      update(chars);
    },
    [dataApi]
  );

  const [paths, setPaths] = useState<Map<string, [string, number]>>(new Map());

  const enableGenerateButton = useMemo<boolean>(() => {
    return (paths.size > 0) &&
      (character !== undefined) &&
      Array.from(paths.values()).every((s) => s.length > 0)
  }, [character, paths])


  const handleGenerateClicked = (
    items: Map<string, [string, number]>,
    character: types.Character | undefined,
  ) => {

    if (character === undefined || character === null || !enableGenerateButton) {
      return
    }

    for (const item of items) {
      const [path, info] = item
      const [name, id] = info
      Downloader.Download(
        path,
        name,
        character.name,
        character.id,
        character.game,
        id,
        []
      );
    }
  }

  const selectModDir = () => {
    App.OpenDirectoryDialog("Select a mod dir", []).then((dir) => {
      if (dir.length <= 0) {
        return;
      }
      setPaths((prev) => {
        prev.set(dir, [pathBaseTrimExt(dir), 0])
        return new Map(prev)
      });
    });
  };

  const selectModZipFile = () => {
    App.OpenMultipleFilesDialog("Select mod zips", [
      "*.zip",
      "*.7z",
      "*.rar",
    ]).then((zips) => {
      if (zips === undefined || zips.length <= 0) {
        return;
      }
      setPaths((prev) => {
        for (const zip of zips) {
          prev.set(zip, [pathBaseTrimExt(zip), 0])
        }
        return new Map(prev)
      });
    });
  };

  return (
    <div className="flex flex-col w-full h-full px-4 min-w-full">
      <Button
        size={"lg"}
        className={cn(
          "fixed bottom-4 -translate-y-1 end-6 flex flex-row z-10 mx-2 rounded-full backdrop-blur-md",
          enableGenerateButton ? "bg-primary/50" : "bg-secondary/40 text-red-300",
        )}
        variant={enableGenerateButton ? "secondary" : "outline"}
        onClick={() => handleGenerateClicked(paths, character)}
      >
        Generate
      </Button>
      <div className="flex flex-col items-start w-full">
        <img
          src={character?.avatarUrl}
          className="object-contain aspect-square h-60"
        ></img>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <text className="text-4xl py-4 font-semibold w-fit hover:text-secondary-foreground hover:underline">
            {character
              ? "Setting mod for: " + character?.name
              : "Pick a character to select a mod."}
          </text>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="overflow-auto h-[300px]">
          <Card className="p-2">
            {characters.map((c) => {
              return (
                <DropdownMenuItem onClick={() => setCharacter(c)}>
                  <Button className="w-full" variant={"ghost"}>
                    {c.name}
                  </Button>
                </DropdownMenuItem>
              );
            })}
          </Card>
        </DropdownMenuContent>
      </DropdownMenu>
      <FileSelectItems
        selected={Array.from(paths.entries())}
        setModDir={selectModDir}
        setModZipFile={selectModZipFile}
        onGbidChanged={(path, id) => {
          setPaths((prev) => {
            prev.set(path, [prev.get(path)!![0], id])
            return new Map(prev)
          });
        }}
        onNameChanged={(path, name) => {
          setPaths((prev) => {
            prev.set(path, [name, prev.get(path)!![1]])
            return new Map(prev)
          });
        }}
        removeItem={(path) => {
          setPaths((prev) => {
            prev.delete(path)
            return new Map(prev)
          });
        }}
      />
    </div>
  );
}

interface FileSelectProps extends React.HTMLAttributes<HTMLDivElement> {
  selected: [string, [string, number]][];
  setModZipFile: () => void;
  setModDir: () => void;
  onNameChanged: (path: string, name: string) => void;
  onGbidChanged: (path: string, id: number) => void;
  removeItem: (path: string) => void;
}

function FileSelectItems({
  className,
  selected,
  setModZipFile,
  setModDir,
  onNameChanged,
  onGbidChanged,
  removeItem,
}: FileSelectProps) {
  return (
    <div className={cn("", className)}>
      <div className="flex flex-row">
        <Button
          className="w-full justify-start"
          variant="ghost"
          onPointerDown={setModZipFile}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            height="24px"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mr-2 h-4 w-4 fill-foreground"
            viewBox="0 -960 960 960"
            width="24px"
          >
            <path d="M440-440H200v-80h240v-240h80v240h240v80H520v240h-80v-240Z" />
          </svg>
          Add mod zip file
        </Button>
        <Button
          className="w-full justify-start"
          variant="ghost"
          onPointerDown={setModDir}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            height="24px"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mr-2 h-4 w-4 fill-foreground"
            viewBox="0 -960 960 960"
            width="24px"
          >
            <path d="M440-440H200v-80h240v-240h80v240h240v80H520v240h-80v-240Z" />
          </svg>
          Add mod directory
        </Button>
      </div>
      <Card>
        <div className="space-y-1 p-2 overflow-y-auto max-h-[300px]">
          {selected.isEmpty() ? <text className="m-4">No items selected</text> : undefined}
          {selected.map((entry) => (
            <NamableMod
              path={entry[0]}
              name={entry[1][0]}
              gbid={entry[1][1]}
              setGbId={(id) => onGbidChanged(entry[0], id)}
              setName={(name) => onNameChanged(entry[0], name)}
              removeItem={removeItem} />
          )
          )}
        </div>
      </Card>
    </div>
  );
}

function pathBaseTrimExt(path: string): string {
  const start = path.lastIndexOf('\\')
  var end = path.lastIndexOf('.')

  if (end == -1) {
    end = path.length
  }

  return path.slice(start + 1, end)
}

function NamableMod(
  { path, name, gbid, setName, setGbId, removeItem }: {
    path: string;
    name: string;
    gbid: number;
    setName: (name: string) => void;
    setGbId: (id: number) => void;
    removeItem: (path: string) => void;
  }) {

  const handleIdChange = (event: any) => {
    try {
      setGbId(Math.max(0, Math.floor(Number(event.target.value))))
    } catch { }
  }

  return (
    <div
      key={path}
      className="flex flex-row justify-between items-center p-2 rounded-lg hover:bg-primary-foreground"
    >
      <div className="flex flex-col space-y-1">
        <div className="flex flex-row items-center justify-between space-x-1">
          <text className={cn(
            "text-sm pe-1",
            (name.length === 0) ? "text-red-300" : "text-zinc-500"
          )}>
            name
          </text>
          <Input className="w-fit" value={name} onInput={(e: any) => setName(e.target.value)} />
        </div>
        <div className="flex flex-row items-center justify-between space-x-1">
          <text className="text-sm text-zinc-500 pe-1">GB Id</text>
          <Input className="w-fit" type="number" value={gbid} onInput={handleIdChange} />
        </div>
      </div>
      <div className="text-zinc-500  max-w-sm overflow-clip text-ellipsis m-2">{path}</div>
      <Button
        size="icon"
        className="mx-2"
        onPointerDown={() => removeItem(path)}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          height="24px"
          viewBox="0 -960 960 960"
          width="24px"
        >
          <path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z" />
        </svg>
      </Button>
    </div>
  )
}