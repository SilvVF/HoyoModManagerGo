import { cn, useStateProducer } from "@/lib/utils";
import { getRelativeTimeString } from "@/lib/tsutils";
import { types } from "../../../wailsjs/go/models";
import { useParams } from "react-router-dom";
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
import { useContext, useMemo, useState } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { DownloadIcon, FileBoxIcon, TrashIcon } from "lucide-react";
import AsyncImage from "@/components/AsyncImage";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { ApiFile, inDownloadState, ModViewState, useModViewPresenter } from "./ModViewPresenter";
import { LoadingIcon } from "../GameScreen";


export function ModViewScreen() {
  const { id } = useParams();

  const dataApi = useContext(DataApiContext);
  const state = useModViewPresenter(id, dataApi)

  return (
    <div className="flex flex-col min-w-full h-full items-center">
      <CharacterSelectDropdown
        onSelected={state.events.changeCharacter}
        selected={state.character}
      />
      <CharacterImagePreview state={state} />
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
          {state.filesWithDownload.map((file) =>
            <FileListItem
              state={state}
              file={file}
            />
          )}
        </TableBody>
      </Table>
      <div
        dangerouslySetInnerHTML={{ __html: state.htmlContent }}
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

const CharacterImagePreview = ({ state }: { state: ModViewState }) => {

  const [api, setApi] = useState<CarouselApi>();

  return (
    <Carousel
      className="w-11/12"
      setApi={setApi}
    >
      <CarouselContent>
        {state.images.map((url, index) => (
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
  )
}

function FileListItem({ file, state }: {
  file: ApiFile,
  state: ModViewState
}) {

  const downloading = useMemo(() => {
    return inDownloadState(state.downloadStates[file.dlLink])
  }, [state.downloadStates, file])

  const timestamp = useMemo(() => {
    return getRelativeTimeString(1000 * (file.dateAdded ?? 0))
  }, [file.dateAdded])


  const handleDownload = () => {
    state.events.downloadMod(file.dlLink, file.fname)
  }

  const handleTextureDownload = (id: number) => {
    state.events.downloadTexture(
      file.dlLink,
      file.fname,
      id
    )
  }

  const handleDelete = () => {
    if (file.downloadedMod) {
      state.events.deleteMod(file.downloadedMod.id)
    }
  }

  const isDownloaded = file.downloadedMod !== undefined

  return (
    <TableRow>
      <TableCell className="font-medium">{file.fname}</TableCell>
      <TableCell>
        {timestamp}
      </TableCell>
      <TableCell>
        {file.avResults.map(({ result, type, clean }) => (
          <Badge
            className={cn(
              clean
                ? "bg-green-800"
                : "bg-red-800",
              "mx-2 h-6"
            )}
            variant="secondary"
          >
            {type + " " + result}
          </Badge>
        ))}
      </TableCell>
      <TableCell className="text-right min-w-[64px] m-2 space-x-4">
        <div className="flex flex-row justify-end">
          <DownloadButton
            onDownloadAsTextureClick={handleTextureDownload}
            downloaded={isDownloaded}
            onDeleteClick={handleDelete}
            downloading={downloading}
            onDownloadClick={handleDownload}
          />
          <TextureDownloadButton
            mods={state.mods}
            onDownloadAsTexture={handleTextureDownload}
          />
        </div>
      </TableCell>
    </TableRow>
  );
}

function TextureDownloadButton({ mods, onDownloadAsTexture }: {
  mods: types.Mod[],
  onDownloadAsTexture: (id: number) => void
}) {
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
                        onClick={() => onDownloadAsTexture(m.id)}
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
        <LoadingIcon />
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
