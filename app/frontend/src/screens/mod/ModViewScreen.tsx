import { cn, useStateProducer } from "@/lib/utils";
import { getRelativeTimeString } from "@/lib/tsutils";
import * as GbApi from "../../../wailsjs/go/api/GbApi";
import { api, types } from "../../../wailsjs/go/models";
import { useParams } from "react-router-dom";
import { LogPrint } from "../../../wailsjs/runtime/runtime";
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
  CarouselApi,
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
import { dlStates, State, useDownloadStore } from "@/state/downloadStore";
import { useShallow } from "zustand/shallow";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Game } from "@/data/dataapi";
import { DownloadIcon, FileBoxIcon, TrashIcon } from "lucide-react";
import AsyncImage from "@/components/AsyncImage";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import DB from "@/data/database";

const inDownloadState = (state: State | undefined) => {
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
  const [api, setApi] = useState<CarouselApi>();

  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const downloadStates = useDownloadStore(
    useShallow((state) =>
      Object.fromEntries(
        Object.entries(state.downloads)
          .map(([link, download]) => [link, download.state])
      )
    ));
  const running = useDownloadStore(useShallow((state) => state.running));

  const downloaded = useStateProducer<types.Mod[]>(
    [],
    async (update) => {
      DB.selectModsByGbId(Number(id)).then((mods) => update(mods));
    },
    [refreshTrigger, running, id]
  );

  const content = useStateProducer<api.ModPageResponse | undefined>(
    undefined,
    async (update) => {
      const page = await GbApi.ModPage(Number(id));
      update(page);
    },
    [id]
  );

  const images = useMemo(() => {
    return (
      content?._aPreviewMedia?._aImages
        ?.map((image) => `${image._sBaseUrl}/${image._sFile}`)
        ?.filter((url) => url !== undefined)
      ?? []
    );
  }, [content]);

  const deleteMod = async (id: number) => {
    DB.deleteMod(id).then(refresh);
  };

  const refresh = async () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const downloadTexture = async (
    link: string,
    filename: string,
    modId: number
  ) => {
    if (character !== undefined && content?._idRow !== undefined) {
      LogPrint(modId.toString());
      Downloader.DownloadTexture(
        link,
        filename,
        modId,
        content?._idRow,
        images
      );
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
        content?._idRow,
        images
      );
    }
  };

  useEffect(() => {
    let cName = content?._aCategory?._sName;
    if (cName !== undefined && dataApi !== undefined) {
      dataApi.game().then((game) => {
        if (game === Game.ZZZ) {
          return { name: cName.split(" ")[0], game: game }
        } else {
          return { name: cName, game: game }
        }
      })
        .then(({ name, game }) =>
          DB.selectClosestCharacter(name, game).then(setCharacter)
        )
    }
  }, [content, dataApi]);

  return (
    <div className="flex flex-col min-w-full h-full items-center">
      <CharacterSelectDropdown onSelected={setCharacter} selected={character} />
      <Carousel className="w-11/12" setApi={setApi}>
        <CarouselContent>
          {images.map((url, index) => (
            <CarouselItem key={index} className="basis-1/3">
              <Dialog>
                <DialogTrigger asChild>
                  <img className="object-cover aspect-square" src={url} />
                </DialogTrigger>
                <DialogContent className="min-w-[80%] justify-center">
                  <img className="max-h-[calc(80vh)] object-contain overflow-clip" src={url} />
                </DialogContent>
              </Dialog>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious
          onClick={() => {
            api?.scrollTo(api.selectedScrollSnap() - 3);
          }}
          className="me-12"
        />
        <CarouselNext
          onClick={() => {
            api?.scrollTo(api.selectedScrollSnap() + 3);
          }}
          className="me-12"
        />
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
          {content?._aFiles?.map((f) => <FileListItem
            f={f}
            downloadStates={downloadStates}
            download={download}
            downloadTexture={downloadTexture}
            downloaded={downloaded}
            character={character}
            deleteMod={deleteMod}
          />
          ) ?? <></>}
        </TableBody>
      </Table>
      <div
        dangerouslySetInnerHTML={{ __html: content?._sText ?? "" }}
        onClick={(e) => {
          const anchor = (e.target as HTMLElement).closest("a");
          if (anchor) {
            e.preventDefault();
          }
        }}
      ></div>
    </div>
  );
}

function FileListItem(
  {
    f,
    downloadStates,
    downloadTexture,
    download,
    downloaded,
    deleteMod,
    character
  }: {
    f: api.AFile,
    downloadStates: {
      [link: string]: State
    },
    downloadTexture: (url: string, file: string, id: number) => void,
    download: (url: string, file: string) => void,
    downloaded: types.Mod[],
    deleteMod: (id: number) => void,
    character: types.Character | undefined,
  }
) {
  const downloading = useMemo(() => f._sDownloadUrl ? inDownloadState(downloadStates[f._sDownloadUrl]) : false, [downloadStates, f])

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
      <TableCell className="text-right min-w-[64px] m-2 space-x-4">
        <div className="flex flex-row justify-end">
          <DownloadButton
            onDownloadAsTextureClick={(id) =>
              downloadTexture(
                f._sDownloadUrl ?? "",
                f._sFile ?? "",
                id
              )
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
            downloading={downloading}
            onDownloadClick={() =>
              download(f._sDownloadUrl ?? "", f._sFile ?? "")
            }
          />
          <TextureDownloadButton
            character={character}
            onDownloadAsTextureClick={(id) =>
              downloadTexture(
                f._sDownloadUrl ?? "",
                f._sFile ?? "",
                id
              )
            }
          />
        </div>
      </TableCell>
    </TableRow>
  );
}

function TextureDownloadButton({
  character,
  onDownloadAsTextureClick,
}: {
  character: types.Character | undefined;
  onDownloadAsTextureClick: (id: number) => void;
}) {
  const mods = useStateProducer<types.Mod[]>(
    [],
    async (update) => {
      if (character) {
        DB.selectModsByCharacterName(character.name, character.game).then(update);
      }
    },
    [character]
  );

  return (
    <Dialog>
      <DialogTrigger>
        <Button variant={"ghost"}>
          <FileBoxIcon></FileBoxIcon>
        </Button>
      </DialogTrigger>
      <DialogContent >
        <DialogHeader>
          <DialogTitle>Select a mod to attach texture</DialogTitle>
        </DialogHeader>
        <div className="overflow-y-auto">
          {mods.map((m) => {
            return (
              <DialogTrigger>
                <div className="flex-grow overflow-hidden mr-2">
                  <HoverCard>
                    <HoverCardTrigger>
                      <Button
                        variant="ghost"
                        onClick={() => onDownloadAsTextureClick(m.id)}
                      >
                        {m.filename}
                      </Button>
                    </HoverCardTrigger>
                    {(m.previewImages?.filter(it => !it.isBlank())?.length ?? 0) > 0 ? (
                      <HoverCardContent className="flex flex-col w-96 overflow-clip backdrop-blur-md bg-primary/20">
                        <text>{m.filename}</text>
                        <div className="flex flex-row space-x-2 overflow-x-auto">
                          {m.previewImages?.map((uri) => (
                            <AsyncImage key={uri} className="object-cover aspect-square w-70 h-70 m-2" src={uri} />
                          ))}
                        </div>
                      </HoverCardContent>
                    ) : <HoverCardContent>No Images for {m.filename}</HoverCardContent>}

                  </HoverCard>
                </div>
              </DialogTrigger>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DownloadButton(props: {
  downloading: boolean;
  downloaded: boolean;
  onDownloadClick: () => void;
  onDownloadAsTextureClick: (modId: number) => void;
  onDeleteClick: () => void;
}) {
  if (props.downloading) {
    return (
      <div className="inset-0 flex h-(--container-height) w-full items-center justify-end gap-2 bg-background text-sm text-muted-foreground">
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
      >
        <TrashIcon />
      </Button>
    );
  }

  return (
    <Button
      onClick={props.onDownloadClick}
      variant="outline"
      size="icon"
    >
      <DownloadIcon />
    </Button>
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
        const result = await dataApi.characters()
        update(result)
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
