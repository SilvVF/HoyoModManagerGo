import { cn, useStateProducer } from "@/lib/utils";
import { getRelativeTimeString } from "@/lib/tsutils";
import * as GbApi from "../../../wailsjs/go/api/GbApi";
import { api, types } from "../../../wailsjs/go/models";
import { useParams } from "react-router-dom";
import { LogPrint } from "../../../wailsjs/runtime/runtime";
import {
  SelectClosestCharacter,
  SelectCharactersByGame,
  SelectModsByGbId,
  SelectModsByCharacterName,
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
  const downloads = useDownloadStore(useShallow((state) => state.downloads));
  const running = useDownloadStore(useShallow((state) => state.running));

  const downloaded = useStateProducer<types.Mod[]>(
    [],
    async (update) => {
      SelectModsByGbId(Number(id)).then((mods) => update(mods));
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
    Downloader.Delete(id).then(refresh);
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
          SelectClosestCharacter(name, game).then(setCharacter)
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
                      downloading={inDownloadState(
                        downloads[f._sDownloadUrl ?? ""]?.state
                      )}
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
          }) ?? <></>}
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
        SelectModsByCharacterName(character.name, character.game).then(update);
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Select a mod to attach texture</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-300">
          {mods.map((m) => {
            return (
              <DialogTrigger>
                <Button
                  variant="ghost"
                  onClick={() => onDownloadAsTextureClick(m.id)}
                >
                  {m.filename}
                </Button>
              </DialogTrigger>
            );
          })}
        </ScrollArea>
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
