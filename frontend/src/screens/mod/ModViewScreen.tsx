import { cn, getRelativeTimeString, useStateProducer } from "@/lib/utils";
import * as GbApi from "../../../wailsjs/go/api/GbApi";
import { api, types } from "../../../wailsjs/go/models";
import { useParams } from "react-router-dom";
import { LogPrint } from "../../../wailsjs/runtime/runtime";
import {
  SelectModsByCharacterName,
  SelectClosestCharacter,
  SelectCharactersByGame,
} from "../../../wailsjs/go/core/DbHelper";
import * as Downloader from "../../../wailsjs/go/core/Downloader";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useContext, useEffect, useMemo, useState } from "react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Badge } from "@/components/ui/badge";
import { DataApiContext } from "./ModIndexPage";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useDownloadStore } from "@/state/downloadStore";
import { useShallow } from "zustand/shallow";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const dlStates = ["download", "queued", "unzip"];
const inDownloadState = (state: string | undefined) => {
  if (state) {
    return dlStates.includes(state);
  }
  return false;
};

export function ModViewScreen() {
  const { id } = useParams();

  const dataApi = useContext(DataApiContext);
  const [character, setCharacter] = useState<types.Character | undefined>(
    undefined
  );

  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const downloads = useDownloadStore(useShallow((state) => state.downloads));
  const running = useDownloadStore(useShallow((state) => state.running));

  const downloaded = useStateProducer<types.Mod[]>(
    [],
    async (update) => {
      if (character !== undefined) {
        SelectModsByCharacterName(character.name, character.game).then(
          async (mods) => {
            update(mods);
          }
        );
      }
    },
    [character, refreshTrigger, running]
  );

  const content = useStateProducer<api.ModPageResponse | undefined>(
    undefined,
    async (update) => {
      LogPrint(id ?? "undefinded");
      const page = await GbApi.ModPage(Number(id));
      update(page);
    },
    [id]
  );

  const deleteMod = async (id: number) => {
    Downloader.Delete(id).then(() => refresh());
  };
  // const deleteTexture = async (id: number) => {
  //   Downloader.DeleteTexture(id).then(() => refresh());
  // };

  const refresh = async () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const downloadTexture = async (
    link: string,
    filename: string,
    modId: number
  ) => {
    if (character !== undefined && content?._idRow !== undefined) {
      LogPrint(modId.toString())
      Downloader.DownloadTexture(link, filename, modId, content?._idRow);
    }
  };

  const download = async (link: string, filename: string) => {
    if (character !== undefined && content?._idRow !== undefined) {
      Downloader.Download(
        link,
        filename,
        character.name,
        character.id,
        character.game,
        content?._idRow
      );
    }
  };

  useEffect(() => {
    (async () => {
      let cName = content?._aCategory?._sName;
      if (cName !== undefined && dataApi !== undefined) {

        if (await dataApi.game() === 3) {
          cName = cName.split(" ")[0]
        }

        SelectClosestCharacter(cName, await dataApi?.game()).then((character) =>
          setCharacter(character)
        );
      }
    })();
  }, [content, dataApi]);

  const images = useMemo(() => {
    return (
      content?._aPreviewMedia?._aImages
        ?.map((it) => `${it._sBaseUrl}/${it._sFile}`)
        ?.filter((it) => it !== undefined) ?? []
    );
  }, [content]);

  return (
    <div className="flex flex-col min-w-screen h-full items-center">
      <CharacterSelectDropdown onSelected={setCharacter} selected={character} />
      <Carousel className="w-full m-8">
        <CarouselContent>
          {images.map((url, index) => (
            <CarouselItem key={index} className="pl-1 basis-1/3">
              <div className="p-1">
                <img
                  className="object-cover aspect-square h-[500px]"
                  src={url}
                />
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="m-16" />
        <CarouselNext className="m-16" />
      </Carousel>
      <Table>
        <TableCaption>Mods available to download.</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">Name</TableHead>
            <TableHead>Upload Date</TableHead>
            <TableHead>Tags</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {content?._aFiles?.map((f) => {
            return (
              <TableRow>
                <TableCell className="font-medium">{f._sFile}</TableCell>
                <TableCell>
                  {getRelativeTimeString(1000 * (f._tsDateAdded ?? 0))}
                </TableCell>
                <TableCell>
                  {[
                    f._sClamAvResult,
                    f._sAvastAvResult,
                    f._sAnalysisResult,
                  ].map((result) => {
                    if (result) {
                      return (
                        <Badge
                          className={cn(
                            result === "clean" ||
                              result === "File passed analysis"
                              ? "bg-green-800"
                              : "bg-red-800",
                            "mx-2 h-6"
                          )}
                          variant="secondary"
                        >
                          {result}
                        </Badge>
                      );
                    }
                  })}
                </TableCell>
                <TableCell className="text-right min-w-[64px] m-2">
                  <DownloadButton
                    mods={downloaded}
                    onDownloadAsTextureClick={(id) =>
                      downloadTexture(f._sDownloadUrl ?? "", f._sFile ?? "", id)
                    }
                    downloaded={downloaded
                      .map((it) => it.gbFileName.toLowerCase())
                      .includes(f._sFile?.toLowerCase() ?? "")}
                    onDeleteClick={() => {
                      const mod = downloaded.find(
                        (it) =>
                          it.gbFileName.toLowerCase() ===
                          (f._sFile?.toLowerCase() ?? "")
                      );
                      if (mod) {
                        deleteMod(mod.id);
                      }
                    }}
                    downloading={inDownloadState(
                      downloads[f._sDownloadUrl ?? ""]?.state
                    )}
                    onDownloadClick={() =>
                      download(f._sDownloadUrl ?? "", f._sFile ?? "")
                    }
                  />
                </TableCell>
              </TableRow>
            );
          }) ?? <></>}
        </TableBody>
      </Table>
      <div dangerouslySetInnerHTML={{ __html: content?._sText ?? "" }}></div>
    </div>
  );
}

function DownloadButton(props: {
  mods: types.Mod[];
  downloading: boolean;
  downloaded: boolean;
  onDownloadClick: () => void;
  onDownloadAsTextureClick: (modId: number) => void;
  onDeleteClick: () => void;
}) {
  if (props.downloading) {
    return (
      <div className="inset-0 flex h-[--container-height] w-full items-center justify-end gap-2 bg-background text-sm text-muted-foreground">
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
          {...props}
        >
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
        Downloading...
      </div>
    );
  }

  if (props.downloaded) {
    return (
      <Button
        onClick={props.onDeleteClick}
        variant="outline"
        size="icon"
        className="fade-in fade-out"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          height="24px"
          viewBox="0 -960 960 960"
          width="24px"
          fill="#e8eaed"
        >
          <path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z" />
        </svg>
      </Button>
    );
  }

  return (
    <div className="flex flex-row">
      <Button
        onClick={props.onDownloadClick}
        variant="outline"
        size="icon"
        className="fade-in fade-out"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          height="24px"
          viewBox="0 -960 960 960"
          width="24px"
          fill="#e8eaed"
        >
          <path d="M480-320 280-520l56-58 104 104v-326h80v326l104-104 56 58-200 200ZM240-160q-33 0-56.5-23.5T160-240v-120h80v120h480v-120h80v120q0 33-23.5 56.5T720-160H240Z" />
        </svg>
      </Button>
      <Dialog>
        <DialogTrigger>Open</DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select a mod to attach texture</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-300">
            {props.mods.map((m) => {
              return (
                <Button
                  variant="ghost"
                  onClick={() => props.onDownloadAsTextureClick(m.id)}
                >
                  {m.filename}
                </Button>
              );
            })}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function CharacterSelectDropdown(props: {
  selected: types.Character | undefined;
  onSelected: (c: types.Character) => void;
}) {
  const dataApi = useContext(DataApiContext);

  const characters = useStateProducer<types.Character[]>(
    [],
    async (update) => {
      if (dataApi) {
        SelectCharactersByGame(await dataApi.game()).then((v) => update(v));
      }
    },
    [dataApi]
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div className="flex flex-col">
          <img
            src={props.selected?.avatarUrl}
            className="object-contain aspect-square h-32"
          ></img>
          <b>{props.selected?.name}</b>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="">
        <ScrollArea className="h-[300px]">
          {characters.map((c) => {
            return (
              <DropdownMenuItem onClick={() => props.onSelected(c)}>
                <span className="w-full">{c.name}</span>
              </DropdownMenuItem>
            );
          })}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
