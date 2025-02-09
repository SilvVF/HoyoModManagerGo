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
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { types } from "wailsjs/go/models";
import * as App from "wailsjs/go/main/App";

export default function ImportScreen() {
  const params = useParams();

  const location = useLocation();
  const navigate = useNavigate();

  const [selected, setSelected] = useState<types.Character | undefined>(
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

  const [paths, setPaths] = useState<string[]>([]);

  const selectModDir = () => {
    App.OpenDirectoryDialog("Select a mod dir", []).then((dir) => {
      if (dir.length <= 0) {
        return;
      }
      setPaths((prev) => [dir, ...prev]);
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
      setPaths((prev) => [...zips, ...prev]);
    });
  };

  return (
    <div className="flex flex-col w-full h-full px-4">
      {`${params["game"]} ${location.state["game"]}`}
      <Button onClick={() => navigate(-1)}></Button>
      <div className="flex flex-col items-start w-full">
        <img
          src={selected?.avatarUrl}
          className="object-contain aspect-square h-60"
        ></img>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <text className="text-4xl py-4 font-semibold w-fit hover:text-secondary-foreground hover:underline">
            {selected
              ? "Setting mod for: " + selected?.name
              : "Pick a character to select a mod."}
          </text>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="overflow-auto h-[300px]">
          <Card className="p-2">
            {characters.map((c) => {
              return (
                <DropdownMenuItem onClick={() => setSelected(c)}>
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
        selected={paths}
        setModDir={selectModDir}
        setModZipFile={selectModZipFile}
        removeItem={(path) => {
          setPaths((prev) => prev.filter((it) => it != path));
        }}
      />
    </div>
  );
}

interface FileSelectProps extends React.HTMLAttributes<HTMLDivElement> {
  selected: string[];
  setModZipFile: () => void;
  setModDir: () => void;
  removeItem: (path: string) => void;
}

function FileSelectItems({
  className,
  selected,
  setModZipFile,
  setModDir,
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
          {selected.isEmpty() ? <text>No items selected</text> : undefined}
          {selected.map((path) => {
            return (
              <div
                key={path}
                className="flex flex-row justify-between items-center p-2 rounded-lg hover:bg-primary-foreground"
              >
                <div className="text-zinc-500  m-2">{path}</div>
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
            );
          })}
        </div>
      </Card>
    </div>
  );
}
