import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselApi,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
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
import { Separator } from "@/components/ui/separator";
import { cn, useStateProducer } from "@/lib/utils";
import { useKeyMapperStore } from "@/state/keymapperStore";
import { EditIcon, SearchIcon, TrashIcon } from "lucide-react";
import React, { useMemo } from "react";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  EnableModById,
  RenameMod,
  SelectClosestCharacter,
  SelectModById,
  UpdateModGbId,
  UpdateModImages,
} from "wailsjs/go/core/DbHelper";
import { types } from "wailsjs/go/models";
import { useShallow } from "zustand/shallow";
import { NameDialogContent } from "@/components/NameDialog";
import { ModActionsDropDown } from "@/components/CharacterInfoCard";
import * as Downloader from "wailsjs/go/core/Downloader"
import { Switch } from "@/components/ui/switch";
import { OpenMultipleFilesDialog } from "wailsjs/go/main/App";
import { ConfirmInput } from "@/components/ConfirmInput";
import { SectionList } from "@/components/SectionList";
import { Card } from "@/components/ui/card";
import { imageFileExtensions, isValidUrl } from "@/lib/tsutils";
import AsyncImage from "@/components/AsyncImage";
import useTransitionNavigate, { useTransitionNavigateDelta } from "@/hooks/useCrossfadeNavigate";


type DialogType =
  | "rename_mod"
  | "create_tag"
  | "rename_tag"
  | "set_mod_image"

export function KeymappingScreen() {
  const { modId } = useParams();
  const navigate = useTransitionNavigate();
  const navigateDelta = useTransitionNavigateDelta();

  const [modRefreshTrigger, setModRefreshTrigger] = useState(0);
  const refreshMod = () => setModRefreshTrigger(p => p + 1)

  const mod = useStateProducer<types.Mod | undefined>(
    undefined,
    async (update) => {
      SelectModById(Number(modId)).then((m) => update(m));
    },
    [modId, modRefreshTrigger]
  );

  const character = useStateProducer<types.Character | undefined>(
    undefined,
    async (update) => {
      if (mod) {
        SelectClosestCharacter(mod.character, mod.game).then((c) => update(c));
      }
    },
    [mod]
  );

  const [dialog, setDialog] = useState<DialogType | undefined>(undefined);

  const dialogSettings = useMemo(() => {
    return {
      rename_mod: {
        title: "Rename mod",
        description:
          "rename the current mod (this will change the folder name in files)",
        onSuccess: (id: number, name: string) => {
          RenameMod(id, name).then(refreshMod);
        },
      },
      create_tag: {
        title: "Create tag",
        description: "create a tag for the mod",
        onSuccess: () => { },
      },
      rename_tag: {
        title: "Rename tag",
        description: "Rename the current tag",
        onSuccess: () => { },
      },
      set_mod_image: {
        title: "Add image url",
        description: "input a url to add to the mod",
        onSuccess: (id: number, url: string) => {
          if (mod !== undefined && isValidUrl(url)) {
            const set = new Set(mod.previewImages)
            set.add(url)
            UpdateModImages(id, Array.from(set)).then(refreshMod)
          }
        },
      },
    };
  }, [mod]);

  const [expandImgs, setExpandImgs] = useState(false);
  const [hoveredImg, setHoveredImg] = useState("");

  const deleteMod = async (id: number) => {
    Downloader.Delete(id).then(() => navigateDelta(-1));
  };

  const enableMod = async (id: number, enabled: boolean) => {
    EnableModById(enabled, id).then(refreshMod);
  };

  const Settings = useMemo(() => {
    if (dialog === undefined || mod === undefined) return undefined;
    const curr = dialogSettings[dialog];
    return (
      <NameDialogContent
        title={curr.title}
        description={curr.description}
        onSuccess={(input) => {
          curr.onSuccess(mod.id, input)
        }}
      />
    );
  }, [mod, dialog, dialogSettings]);


  const removeImageFile = (uri: string, mod: types.Mod) => {
    const set = new Set(mod.previewImages)
    set.delete(uri)
    UpdateModImages(mod.id, Array.from(set)).then(refreshMod)
  }

  const addImageFile = () => {
    OpenMultipleFilesDialog("select an image", imageFileExtensions).then((files) => {
      if (files === undefined || files.isEmpty()) {
        return
      }
      const set = new Set(mod?.previewImages ?? [])
      for (const file of files) {
        set.add("file://" + file)
      }
      UpdateModImages(mod?.id ?? -1, Array.from(set)).then(refreshMod)
    })
  }

  const hoverImg = expandImgs ? hoveredImg : ""

  if (character === undefined || mod === undefined) {
    return <></>
  }


  return (
    <div className="flex flex-col">
      <Dialog open={dialog !== undefined} onOpenChange={(open) => setDialog((prev) => open ? prev : undefined)}>
        <div className="flex flex-row items-end justify-start space-y-4">
          <img
            src={character.avatarUrl}
            className="object-contain aspect-square h-32"
          />
          <div className="flex flex-row items-center w-full">
            <div className="flex flex-col">
              <text className="text-xl font-semibold text-muted-foreground">
                Editing:
              </text>
              <div className="flex flex-row items-center space-x-2">
                <text className="text-3xl font-semibold me-4">{mod.filename}</text>
                <ConfirmInput
                  key={mod.gbId}
                  Label={
                    <text className="text-sm text-zinc-500">GB id</text>
                  }
                  className="w-32"
                  value={mod.gbId}
                  getValue={(value) => {
                    return Number(value)
                  }}
                  getInput={(value) => {
                    return Math.max(0, Math.floor(Number(value)))
                  }}
                  changeValue={(v) => {
                    UpdateModGbId(mod.id, v).finally(refreshMod)
                  }}
                  type="number"
                />
                <div className="w-2" />
                <Switch
                  checked={mod.enabled}
                  onCheckedChange={() =>
                    enableMod(mod.id, !mod.enabled)
                  }
                />

                {mod ?
                  <ModActionsDropDown
                    onEnable={() => enableMod(mod.id, !mod.enabled)}
                    onDelete={() => deleteMod(mod.id)}
                    onRename={() =>
                      setDialog("rename_mod")
                    }
                    onView={() => {
                      if (mod.gbId !== 0) {
                        navigate(`/mods/${mod.gbId}`);
                      }
                    }}
                  />
                  : undefined}
                {Settings}

              </div>
            </div>
          </div>
        </div>
        <ModPreviewImages
          mod={mod}
          hovered={hoverImg}
          setHovered={(uri) => setHoveredImg(uri)}
        />
        <ImageSelect
          images={mod.previewImages}
          addImage={() => setDialog("set_mod_image")}
          hovered={hoverImg}
          expanded={expandImgs}
          setExpanded={(exp) => setExpandImgs(exp)}
          addImageFile={addImageFile}
          onHovered={(uri) => setHoveredImg(uri)}
          removeImage={(uri) => removeImageFile(uri, mod)}
        />
        <KeybindsUi
          modId={mod.id}
        />
      </Dialog>
    </div>
  );
}

function KeybindsUi(
  { modId }: {
    modId: number | undefined,
  }
) {
  const [loading, setLoading] = useState(false)

  const load = useKeyMapperStore((state) => state.load);
  const loadPrevious = useKeyMapperStore((state) => state.loadPrevious);
  const unload = useKeyMapperStore((state) => state.unload);
  const save = useKeyMapperStore((state) => state.save);
  const deleteKeymap = useKeyMapperStore((state) => state.deleteKeymap);
  const write = useKeyMapperStore((state) => state.write);

  const saved = useKeyMapperStore(useShallow((state) => state.backups ?? []));
  const keymappings = useKeyMapperStore((state) => state.keymappings);
  const [held, setHeld] = useState<string[]>([]);
  const [err, setErr] = useState<any | undefined>(undefined);

  const [search, setSearch] = useState("");

  const keymap = useMemo(() => {
    return keymappings
      .groupBy<string>((v) => v.name)
      .filter((entry) => {
        const [name, binds] = entry

        return search.isBlank() || name.includes(search) || binds.any((bind) => bind.key.includes(search))
      })
  }, [keymappings, search]);

  const handleSearch = (event: any) => {
    setSearch(event.target.value);
  };

  const loadKeymaps = () => {

    setLoading(true);

    try {
      load(Number(modId))
        .then(() => setErr(undefined))
        .catch((e) => setErr(e))
        .finally(() => setLoading(false));
    } catch (e) {
      setErr(e)
      setLoading(false);
    }
  }

  useEffect(() => {

    loadKeymaps();

    return () => unload();
  }, [modId]);

  const writeKeyMap = (section: string, sectionKey: string, keys: string[]) => {
    if (keys.isEmpty()) {
      return;
    }
    write(section, sectionKey, keys).finally(() => setHeld([]));
  };

  if (err !== undefined) {
    return (
      <div className="min-w-screen min-h-screen">
        <KeyMapLoadErrorPage
          err={err}
          id={modId}
          retry={loadKeymaps}
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div>
        LOADING
      </div>
    )
  }


  if (keymappings?.isEmpty() && !loading) {
    return (
      <div className="">
        <KeyMapLoadErrorPage
          err={"no keybinds are editable for this mod"}
          id={modId}
          retry={loadKeymaps}
        />
      </div>
    )
  }

  return (
    <div className="w-full flex flex-col pb-12 pt-6 px-12 items-start">
      <div className="fixed bottom-4 -translate-y-1/2 end-12 flex flex-row z-10 space-x-2">
        <NameDialog
          title="Keymap name"
          description="name the current keymap to load later"
          onSuccess={(text) => save(Number(modId), text)}
        />
        <Button
          onClick={() => load(Number(modId))}
          className="rounded-full backdrop-blur-md bg-primary/30"
          size={"lg"}
          variant={"ghost"}
        >
          Reset
        </Button>
        <SelectKeymapDialog
          keymaps={saved}
          onSelected={(file) => loadPrevious(Number(modId), file)}
          onDelete={(file) => deleteKeymap(file)}
        />
      </div>



      <div className="flex w-3/4 items-center space-x-2">
        <Input
          value={search}
          className="p-4 m-4"
          placeholder="Search..."
          onInput={handleSearch}
          onSubmit={handleSearch}
        />
        <Button size="icon" onClick={() => { }}>
          <SearchIcon />
        </Button>
      </div>


      <div className="grid grid-cols-2 w-full items-center justify-center">
        {keymap.map((entry) => {

          const [group, arr] = entry

          return (
            <Card className="flex flex-col p-4 m-2 space-y-1  overflow-hidden">
              <div className="text-left text-xl">
                {group}
              </div>
              {arr?.map((bind) => (
                <div key={bind.name + bind.sectionKey}>
                  <div className="flex flex-row space-x-4 items-center p-2 justify-between">
                    <div className="text-lg text-muted-foreground">
                      {bind.sectionKey}
                    </div>
                    {bind.sectionKey === "key" ? (
                      <Input
                        value={bind.key.replaceAll(" ", " + ")}
                        className="w-9/12 max-w-96"
                        tabIndex={-1}
                        onKeyDown={(event) => {
                          if (!held.includes(event.key)) {
                            setHeld((p) => [...p, event.key]);
                          }
                        }}
                        onKeyUp={() =>
                          writeKeyMap(bind.name, bind.sectionKey, held)
                        }
                        readOnly
                      />
                    ) : <ConfirmInput
                      className="w-9/12 max-w-96"
                      value={bind.key}
                      getValue={(value) => value}
                      getInput={(value) => value}
                      changeValue={async (v) => { return v }}
                    />}
                  </div>
                  <Separator />
                </div>
              ))}
            </Card>
          );
        })}
      </div>
    </div>
  )
}

function SelectKeymapDialog(props: {
  onSelected: (file: string) => void;
  onDelete: (file: string) => void;
  keymaps: string[] | undefined;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          className="rounded-full backdrop-blur-md bg-primary/30"
          size={"lg"}
          variant={"ghost"}
        >
          Load
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Enable keymap</DialogTitle>
          <DialogDescription>
            Select a saved keymap to enable.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center space-y-2">
          {props.keymaps?.map((keymap) => {
            const split = keymap.split("_");
            return (
              <div className="flex flex-row w-full justify-between">
                <DialogTrigger asChild>
                  <Button
                    className="w-full"
                    variant={"ghost"}
                    onPointerDown={() => props.onSelected(keymap)}
                  >
                    <div className="flex flex-row min-w-full justify-between items-center">
                      <text className="text-lg">{split[0]}</text>
                      <text className="text-muted-foreground text-ellipsis">
                        {formatDate(
                          split[split.length - 2] +
                          "_" +
                          split[split.length - 1].replace(".ini", "")
                        )}
                      </text>
                    </div>
                  </Button>
                </DialogTrigger>
                <Button
                  size={"icon"}
                  variant={"outline"}
                  onPointerDown={() => props.onDelete(keymap)}
                >
                  <TrashIcon />
                </Button>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function NameDialog(props: {
  title: string;
  description: string;
  onSuccess: (name: string) => void;
}) {
  const [inputValue, setInputValue] = useState("");
  const handleChange = (event: any) => {
    setInputValue(event.target.value);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          className="rounded-full backdrop-blur-md bg-primary/30"
          size={"lg"}
          variant={"ghost"}
        >
          Save
        </Button>
      </DialogTrigger>
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
        <DialogFooter className="sm:justify-end">
          <DialogClose asChild>
            <Button type="button" variant="secondary">
              Cancel
            </Button>
          </DialogClose>
          <DialogClose asChild>
            <Button
              type="button"
              variant="default"
              onPointerDown={() => props.onSuccess(inputValue)}
            >
              Save
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const formatDate = (dateString: string): string => {
  const [date, time] = dateString.split("_");
  const [year, month, day] = date.split("-");
  const [hours, minutes, seconds] = time.split("-");

  // Create a Date object
  const dateObj = new Date(
    `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`
  );

  // Format using Intl.DateTimeFormat for localization
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: true,
  }).format(dateObj);
};

function ModPreviewImages(props: { mod: types.Mod | undefined, hovered: string, setHovered: (uri: string) => void }) {
  const [api, setApi] = React.useState<CarouselApi>();
  const [lastHover, setLastHover] = useState("");

  useEffect(() => {
    const images = props.mod?.previewImages
    if (!images) {
      return
    }
    const idx = images.findIndex((url) => url === props.hovered)
    const id = setTimeout(() => {
      if (idx >= 0 && idx <= images.length && lastHover !== props.hovered) {
        api?.scrollTo(idx);
      }
    }, 200)
    return () => clearTimeout(id)
  }, [props.hovered, props.mod, api, lastHover])

  if (props.mod?.previewImages === undefined || props.mod.previewImages.length === 0) {
    return (
      <div className="p-6 flex items-center justify-center">
        <text className="text-lg text-muted-foreground">No preview images</text>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col items-end space-y-1 my-4">
      <Carousel className="w-full" setApi={setApi}>
        <CarouselContent>
          {props?.mod?.previewImages?.map((url) => (
            <ImagePreviewItem
              url={url}
              onMouseEnter={() => {
                setLastHover(url)
                props.setHovered(url)
              }}
              onMouseLeave={() => {
                setLastHover("")
                props.setHovered("")
              }}
              hovered={props.hovered} />
          ))}
        </CarouselContent>
        <CarouselPrevious
          onClick={() => {
            api?.scrollTo(api.selectedScrollSnap() - 4);
          }}
          className="absolute start-2  rounded-full backdrop-blur-md bg-primary/30"
        />
        <CarouselNext
          onClick={() => {
            api?.scrollTo(api.selectedScrollSnap() + 4);
          }}
          className="absolute end-2 rounded-full backdrop-blur-md bg-primary/30"
        />
      </Carousel>
    </div>
  );
}

const ImagePreviewItem = ({ url, hovered, onMouseEnter, onMouseLeave }: { url: string, hovered: string, onMouseEnter: () => void, onMouseLeave: () => void }) => {
  return (
    <CarouselItem key={url} className="basis-1/4">
      <div
        className={cn(hovered === url ? "border-4 border-primary" : "")}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}>
        <AsyncImage className="object-cover aspect-square" uri={url} />
      </div>
    </CarouselItem>
  )
}

interface ImageSelectProps extends React.HTMLAttributes<HTMLDivElement> {
  images: string[];
  expanded: boolean;
  hovered: string;
  setExpanded: (expanded: boolean) => void;
  addImage: () => void;
  onHovered: (uri: string) => void;
  addImageFile: () => void;
  removeImage: (uri: string) => void;
}

function ImageSelect({
  className,
  images,
  expanded,
  setExpanded,
  hovered,
  onHovered,
  addImage,
  addImageFile,
  removeImage
}: ImageSelectProps) {
  return (
    <div className="flex flex-col">
      <Button
        variant="link"
        className="w-32 p-2"
        onPointerDown={() => setExpanded(!expanded)}>
        Edit Images
        <EditIcon />
      </Button>
      <div className={cn(
        expanded ? "opacity-100 visible" : "opacity-0 max-h-0 hidden",
        className
      )}>
        <SectionList
          items={images}
          createKey={(item) => item}
          actions={[
            { title: "Add Image Link", onClick: addImage },
            { title: "Add Image file", onClick: addImageFile }
          ]}
          itemContent={(uri) =>
          (<div
            key={uri}
            onMouseEnter={() => onHovered(uri)}
            onMouseLeave={() => onHovered("")}
            className={cn(
              hovered === uri
                ? "bg-primary-foreground"
                : "",
              "flex flex-row justify-between items-center p-2 rounded-lg hover:bg-primary-foreground w-full")}
          >
            <div className="text-zinc-500  m-2">{uri}</div>
            <Button
              size="icon"
              className="mx-2"
              onPointerDown={() => removeImage(uri)}
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
          </div>)
          }
        />
      </div>
    </div>
  )
}

function KeyMapLoadErrorPage(props: {
  err: any;
  id: number | undefined;
  retry: () => void;
}) {
  return (
    <div className="w-full flex flex-col items-center justify-center space-y-4">
      <text className="text-3xl font-semibold tracking-tight">{`Failed to load keyconfig for mod ${props.id}`}</text>
      <text className="text-2xl font-semibold tracking-tight text-muted-foreground">{`${props.err}`}</text>
      <Button size={"lg"} onPointerDown={props.retry}>
        Retry
      </Button>
    </div>
  );
}
