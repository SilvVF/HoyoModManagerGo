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
import { cn } from "@/lib/utils";
import { useKeyMapperStore } from "@/state/keymapperStore";
import { EditIcon, SearchIcon, TrashIcon, XIcon } from "lucide-react";
import React, { useMemo } from "react";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { core, types } from "wailsjs/go/models";
import { useShallow } from "zustand/shallow";
import { ModActionsDropDown } from "@/components/CharacterInfoCard";
import { Switch } from "@/components/ui/switch";
import { OpenMultipleFilesDialog } from "wailsjs/go/main/App";
import { ConfirmInput } from "@/components/ConfirmInput";
import { SectionList } from "@/components/SectionList";
import { Card } from "@/components/ui/card";
import { imageFileExtensions } from "@/lib/tsutils";
import AsyncImage from "@/components/AsyncImage";
import useTransitionNavigate, {
  useTransitionNavigateDelta,
} from "@/hooks/useCrossfadeNavigate";
import { useDialogStore } from "@/components/appdialog";
import DB, { useMod } from "@/data/database";
import { useQuery } from "@tanstack/react-query";

export function KeymappingScreen() {
  const { modId } = useParams();
  const navigate = useTransitionNavigate();
  const navigateDelta = useTransitionNavigateDelta();
  const setDialog = useDialogStore(useShallow((s) => s.setDialog));

  const { data: mod, isSuccess: modSuccess } = useMod(Number(modId), [modId]);

  const { data: tagsResult } = useQuery({
    queryKey: DB.tagsKey(),
    queryFn: async () => await DB.selectTagsByModId(mod!!.id),
    enabled: modSuccess,
  });

  const tags = tagsResult ?? [];

  const { data: character } = useQuery({
    queryKey: DB.charactersKey(),
    queryFn: async () => DB.selectClosestCharacter(mod!!.character, mod!!.game),
    enabled: modSuccess,
  });

  const [expandImgs, setExpandImgs] = useState(false);
  const [hoveredImg, setHoveredImg] = useState("");

  const deleteMod = async (id: number) => {
    DB.deleteMod(id).then(() => navigateDelta(-1));
  };

  const enableMod = async (id: number, enabled: boolean) => {
    DB.enableMod(id, enabled);
  };

  const removeImageFile = (uri: string, mod: types.Mod) => {
    const set = new Set(mod.previewImages);
    set.delete(uri);
    DB.updateModImages(mod.id, Array.from(set));
  };

  const handleDeleteTag = (name: string, modId: number) => {
    DB.deleteTag(modId, name);
  };

  const addImageFile = () => {
    OpenMultipleFilesDialog("select an image", imageFileExtensions).then(
      (files) => {
        if (files === undefined || files.isEmpty()) {
          return;
        }
        const set = new Set(mod?.previewImages ?? []);
        for (const file of files) {
          set.add("file://" + file);
        }
        DB.updateModImages(mod?.id ?? -1, Array.from(set));
      },
    );
  };

  const hoverImg = expandImgs ? hoveredImg : "";

  if (character === undefined || mod === undefined) {
    return <></>;
  }

  return (
    <div className="flex flex-col">
      <div className="flex flex-row items-end justify-start space-y-4">
        <img
          src={character.avatarUrl}
          className="mx-6 mt-6 aspect-square h-42 object-contain"
        />
        <div className="flex w-full flex-row items-center">
          <div className="flex flex-col">
            <text className="text-xl font-semibold text-muted-foreground">
              Editing:
            </text>
            <div className="flex flex-col space-y-2">
              <text className="me-4 w-fit text-3xl font-semibold">
                {mod.filename}
              </text>
              <div className="flex flex-row items-center space-x-2">
                <ConfirmInput
                  key={mod.gbId}
                  Label={
                    <text className="text-sm text-muted-foreground">GB id</text>
                  }
                  className="w-32"
                  value={mod.gbId}
                  getValue={(value) => {
                    return Number(value);
                  }}
                  getInput={(value) => {
                    return Math.max(0, Math.floor(Number(value)));
                  }}
                  changeValue={(v) => {
                    DB.updateModGbId(mod.id, v);
                  }}
                  type="number"
                />
                <Switch
                  checked={mod.enabled}
                  onCheckedChange={() => enableMod(mod.id, !mod.enabled)}
                />

                {mod ? (
                  <ModActionsDropDown
                    addTag={() =>
                      setDialog({
                        type: "add_tag",
                        mod: mod,
                        refresh: () => {},
                      })
                    }
                    onEnable={() => enableMod(mod.id, !mod.enabled)}
                    onDelete={() => deleteMod(mod.id)}
                    onRename={() =>
                      setDialog({
                        type: "rename_mod",
                        id: mod.id,
                        refresh: () => {},
                      })
                    }
                    onView={() => {
                      if (mod.gbId !== 0) {
                        navigate(`/mods/${mod.gbId}`);
                      }
                    }}
                  />
                ) : undefined}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="m-4 flex flex-row overflow-x-auto">
        {tags.map((tag) => {
          return (
            <Button
              className="rounded-full"
              onClick={() => handleDeleteTag(tag.name, tag.modId)}
            >
              {tag.name}
              <XIcon />
            </Button>
          );
        })}
      </div>
      <ModPreviewImages
        mod={mod}
        hovered={hoverImg}
        setHovered={(uri) => setHoveredImg(uri)}
      />
      <ImageSelect
        images={mod.previewImages}
        addImage={() =>
          setDialog({ type: "set_mod_image", mod: mod, refresh: () => {} })
        }
        hovered={hoverImg}
        expanded={expandImgs}
        setExpanded={(exp) => setExpandImgs(exp)}
        addImageFile={addImageFile}
        onHovered={(uri) => setHoveredImg(uri)}
        removeImage={(uri) => removeImageFile(uri, mod)}
      />
      <KeybindsUi modId={mod.id} />
    </div>
  );
}

function KeybindsUi({ modId }: { modId: number | undefined }) {
  const [loading, setLoading] = useState(false);

  const load = useKeyMapperStore((state) => state.load);
  const loadPrevious = useKeyMapperStore((state) => state.loadPrevious);
  const unload = useKeyMapperStore((state) => state.unload);
  const save = useKeyMapperStore((state) => state.save);
  const deleteKeymap = useKeyMapperStore((state) => state.deleteKeymap);
  const loadDefault = useKeyMapperStore((state) => state.loadDefault);

  const saved = useKeyMapperStore(useShallow((state) => state.backups ?? []));
  const keymappings = useKeyMapperStore((state) => state.keymappings);
  const [err, setErr] = useState<any | undefined>(undefined);

  const [search, setSearch] = useState("");

  const keymap = useMemo(() => {
    return keymappings
      .groupBy<string>((v) => v.name)
      .filter((entry) => {
        const [name, binds] = entry;

        return (
          search.isBlank() ||
          name.includes(search) ||
          binds.any((bind) => bind.key.includes(search))
        );
      });
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
      setErr(e);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadKeymaps();

    return () => unload();
  }, [modId]);

  if (err !== undefined) {
    return (
      <div className="h-full w-full flex-col items-center">
        <KeyMapLoadErrorPage err={err} id={modId} retry={loadKeymaps} />
      </div>
    );
  }

  if (loading) {
    return <div>LOADING</div>;
  }

  if (keymappings?.isEmpty() && !loading) {
    return (
      <div className="flex h-full w-full flex-col items-center">
        <KeyMapLoadErrorPage
          err={"no keybinds are editable for this mod"}
          id={modId}
          retry={loadKeymaps}
        />
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col items-start px-12 pt-6 pb-12">
      <div className="fixed end-12 bottom-4 z-10 flex -translate-y-1/2 flex-row space-x-2">
        <NameDialog
          title="Keymap name"
          description="name the current keymap to load later"
          onSuccess={(text) => save(Number(modId), text)}
        />
        <Button
          onClick={() => {
            loadDefault();
          }}
          className="rounded-full bg-primary/30 backdrop-blur-md"
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
          className="m-4 p-4"
          placeholder="Search..."
          onInput={handleSearch}
          onSubmit={handleSearch}
        />
        <Button size="icon" onClick={() => {}}>
          <SearchIcon />
        </Button>
      </div>

      <div className="grid w-full grid-cols-2 items-center justify-center">
        {keymap.map((entry) => {
          const [group, arr] = entry;
          return (
            <Card className="m-2 flex flex-col space-y-1 overflow-hidden p-4">
              <div className="text-left text-xl">{group}</div>
              {arr?.map((bind) => (
                <KeyBindEditText bind={bind} />
              ))}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function KeyBindEditText({ bind }: { bind: core.KeyBind }) {
  const [held, setHeld] = useState<string[]>([]);
  const write = useKeyMapperStore((state) => state.write);

  const writeKeyMap = (section: string, sectionKey: string, keys: string[]) => {
    if (keys.isEmpty()) {
      return;
    }
    write(section, sectionKey, keys).finally(() => setHeld([]));
  };

  return (
    <div key={bind.name + bind.sectionKey}>
      <div className="flex flex-row items-center justify-between space-x-4 p-2">
        <div className="text-lg text-muted-foreground">{bind.sectionKey}</div>
        {bind.sectionKey === "key" ? (
          <Input
            value={
              held.isEmpty()
                ? bind.key.replaceAll(" ", " + ")
                : held.join(" + ")
            }
            className="w-9/12 max-w-96"
            tabIndex={-1}
            onKeyDown={(event) => {
              if (!held.includes(event.key)) {
                setHeld((p) => [...p, event.key]);
              }
            }}
            onKeyUp={() => writeKeyMap(bind.name, bind.sectionKey, held)}
            readOnly
          />
        ) : (
          <ConfirmInput
            className="w-9/12 max-w-96"
            value={bind.key}
            getValue={(value) => value}
            getInput={(value) => value}
            changeValue={async (v) => {
              return v;
            }}
          />
        )}
      </div>
      <Separator />
    </div>
  );
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
          className="rounded-full bg-primary/30 backdrop-blur-md"
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
              <div className="flex w-full flex-row justify-between">
                <DialogTrigger asChild>
                  <Button
                    className="w-full"
                    variant={"ghost"}
                    onPointerDown={() => props.onSelected(keymap)}
                  >
                    <div className="flex min-w-full flex-row items-center justify-between">
                      <text className="text-lg">{split[0]}</text>
                      <text className="text-ellipsis text-muted-foreground">
                        {formatDate(
                          split[split.length - 2] +
                            "_" +
                            split[split.length - 1].replace(".ini", ""),
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
          className="rounded-full bg-primary/30 backdrop-blur-md"
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
    `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`,
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

function ModPreviewImages(props: {
  mod: types.Mod | undefined;
  hovered: string;
  setHovered: (uri: string) => void;
}) {
  const [api, setApi] = React.useState<CarouselApi>();
  const [lastHover, setLastHover] = useState("");

  useEffect(() => {
    const images = props.mod?.previewImages;
    if (!images) {
      return;
    }
    const idx = images.findIndex((url) => url === props.hovered);
    const id = setTimeout(() => {
      if (idx >= 0 && idx <= images.length && lastHover !== props.hovered) {
        api?.scrollTo(idx);
      }
    }, 200);
    return () => clearTimeout(id);
  }, [props.hovered, props.mod, api, lastHover]);

  if (
    props.mod?.previewImages === undefined ||
    props.mod.previewImages.length === 0
  ) {
    return (
      <div className="flex items-center justify-center p-6">
        <text className="text-lg text-muted-foreground">No preview images</text>
      </div>
    );
  }

  return (
    <div className="my-4 flex w-full flex-col items-end space-y-1">
      <Carousel className="w-full" setApi={setApi}>
        <CarouselContent>
          {props?.mod?.previewImages?.map((url) => (
            <ImagePreviewItem
              url={url}
              onMouseEnter={() => {
                setLastHover(url);
                props.setHovered(url);
              }}
              onMouseLeave={() => {
                setLastHover("");
                props.setHovered("");
              }}
              hovered={props.hovered}
            />
          ))}
        </CarouselContent>
        <CarouselPrevious
          onClick={() => {
            api?.scrollTo(api.selectedScrollSnap() - 4);
          }}
          className="absolute start-2 rounded-full bg-primary/30 backdrop-blur-md"
        />
        <CarouselNext
          onClick={() => {
            api?.scrollTo(api.selectedScrollSnap() + 4);
          }}
          className="absolute end-2 rounded-full bg-primary/30 backdrop-blur-md"
        />
      </Carousel>
    </div>
  );
}

const ImagePreviewItem = ({
  url,
  hovered,
  onMouseEnter,
  onMouseLeave,
}: {
  url: string;
  hovered: string;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) => {
  return (
    <CarouselItem key={url} className="basis-1/4">
      <div
        className={cn(hovered === url ? "border-4 border-primary" : "")}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        <AsyncImage className="aspect-square object-cover" src={url} />
      </div>
    </CarouselItem>
  );
};

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
  removeImage,
}: ImageSelectProps) {
  return (
    <div className="flex flex-col">
      <Button
        variant="link"
        className="w-32 p-2"
        onPointerDown={() => setExpanded(!expanded)}
      >
        Edit Images
        <EditIcon />
      </Button>
      <div
        className={cn(
          expanded ? "visible opacity-100" : "hidden max-h-0 opacity-0",
          className,
        )}
      >
        <SectionList
          items={images}
          createKey={(item) => item}
          actions={[
            { title: "Add Image Link", onClick: addImage },
            { title: "Add Image file", onClick: addImageFile },
          ]}
          itemContent={(uri) => (
            <div
              key={uri}
              onMouseEnter={() => onHovered(uri)}
              onMouseLeave={() => onHovered("")}
              className={cn(
                hovered === uri ? "bg-primary-foreground" : "",
                "flex w-full flex-row items-center justify-between rounded-lg p-2 hover:bg-primary-foreground",
              )}
            >
              <div className="m-2 text-zinc-500">{uri}</div>
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
            </div>
          )}
        />
      </div>
    </div>
  );
}

function KeyMapLoadErrorPage(props: {
  err: any;
  id: number | undefined;
  retry: () => void;
}) {
  return (
    <div className="mx-12 flex w-fit flex-col items-center justify-center space-y-4 overflow-clip">
      <text className="text-3xl font-semibold tracking-tight">{`Failed to load keyconfig for mod ${props.id}`}</text>
      <p className="max-w-3/4 text-2xl font-semibold tracking-tight text-muted-foreground">{`${props.err}`}</p>
      <Button size={"lg"} onPointerDown={props.retry}>
        Retry
      </Button>
    </div>
  );
}
