import { Button } from "@/components/ui/button";
import {
  Carousel,
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
import { useStateProducer } from "@/lib/utils";
import { useKeyMapperStore } from "@/state/keymapperStore";
import { TrashIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  SelectClosestCharacter,
  SelectModById,
} from "wailsjs/go/core/DbHelper";
import { types } from "wailsjs/go/models";
import { useShallow } from "zustand/shallow";

export function KeymappingScreen() {
  const { modId } = useParams();
  const load = useKeyMapperStore((state) => state.load);
  const loadPrevious = useKeyMapperStore((state) => state.loadPrevious);
  const unload = useKeyMapperStore((state) => state.unload);
  const save = useKeyMapperStore((state) => state.save);
  const deleteKeymap = useKeyMapperStore((state) => state.deleteKeymap);
  const write = useKeyMapperStore((state) => state.write);

  const [held, setHeld] = useState<string[]>([]);

  const saved = useKeyMapperStore(useShallow((state) => state.backups));

  const keymap = useKeyMapperStore(useShallow((state) => state.keymappings));

  const [retry, setRetry] = useState(0);
  const [err, setErr] = useState<any | undefined>(undefined);

  const mod = useStateProducer<types.Mod | undefined>(
    undefined,
    async (update) => {
      SelectModById(Number(modId)).then((m) => update(m));
    },
    [modId]
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

  useEffect(() => {
    try {
      load(Number(modId))
        .then(() => setErr(undefined))
        .catch((e) => setErr(e));
    } catch {}

    return () => {
      unload();
    };
  }, [modId, retry]);

  if (err != undefined) {
    return (
      <div className="min-w-screen min-h-screen">
        <KeyMapLoadErrorPage
          err={err}
          id={modId}
          retry={() => setRetry((r) => r + 1)}
        />
      </div>
    );
  }

  const writeKeyMap = (section: string, sectionKey: string, keys: string[]) => {
    if (keys.isEmpty()) {
      return;
    }
    write(section, sectionKey, keys).finally(() => setHeld([]));
  };


  return (
    <div className="min-w-full min-h-full flex flex-col pb-12 pt-6 px-12 items-start">
      <div className="flex flex-row items-end justify-start space-y-4">
        <img
          src={character?.avatarUrl}
          className="object-contain aspect-square h-32"
        />
        <div className="flex flex-col">
          <text className="text-xl font-semibold text-muted-foreground">
            Editing:
          </text>
          <text className="text-3xl font-semibold">{mod?.filename}</text>
        </div>
      </div>
      <ModPreviewImages mod={mod} />
      <div className="absolute bottom-4 -translate-y-1/2 end-12 flex flex-row z-10 space-x-2">
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
            onDelete={(file) =>  deleteKeymap(file)}
         />
      </div>
      <div className="w-fit flex flex-col py-4 space-y-3">
        {keymap.map((bind) => {
          return (
            <div className="flex flex-col" key={bind.name + bind.sectionKey}>
              <div className="flex flex-row items-center space-x-4 m-2">
                <div className="flex-grow text-left text-xl me-12">
                  {bind.name}
                </div>
                <div className="flex flex-row space-x-4 items-center">
                  <div className="flex-grow text-lg text-muted-foreground">
                    {bind.sectionKey}
                  </div>
                  <Input
                    value={bind.key.replaceAll(" ", " + ")}
                    className="w-96"
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
                </div>
              </div>
              <Separator />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SelectKeymapDialog(props: {
  onSelected: (file: string) => void;
  onDelete: (file: string) => void;
  keymaps: string[];
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
          {props.keymaps.map((keymap) => {
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
                                <text className="text-muted-foreground overflow-ellipsis">
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
                    variant={'outline'}
                    onPointerDown={() => props.onDelete(keymap)}
                >
                        <TrashIcon/>
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
                onPointerDown={() => props.onSuccess(inputValue)}>
                Save
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

const formatDate = (dateString: string): string => {
    const [date, time] = dateString.split('_');
    const [year, month, day] = date.split('-');
    const [hours, minutes, seconds] = time.split('-');
    
    // Create a Date object
    const dateObj = new Date(`${year}-${month}-${day}T${hours}:${minutes}:${seconds}`);
    
    // Format using Intl.DateTimeFormat for localization
    return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: true
    }).format(dateObj);
}

function ModPreviewImages(props: { mod: types.Mod | undefined }) {
  if (props.mod === undefined || props.mod.previewImages.length === 0) {
    return (
      <div className="p-6 w-full flex items-center justify-center">
        <text className="text-lg text-muted-foreground">No preview images</text>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end space-y-1 my-4">
      <Carousel className="w-full">
        <CarouselContent>
          {props.mod?.previewImages.map((url, index) => (
            <CarouselItem key={index} className="basis-1/4">
              <div className="">
                <img
                  className="object-cover aspect-square h-[300px]"
                  src={url}
                />
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="mx-6 rounded-full backdrop-blur-md bg-primary/30" />
        <CarouselNext className="mx-6 rounded-full backdrop-blur-md bg-primary/30" />
      </Carousel>
      <text className="align-end">
        {"Hint: click arr btn alt + <- | -> to scroll"}
      </text>
    </div>
  );
}

function KeyMapLoadErrorPage(props: {
  err: any;
  id: string | undefined;
  retry: () => void;
}) {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center space-y-4">
      <text className="text-3xl font-semibold tracking-tight">{`Failed to load keyconfig for mod ${props.id}`}</text>
      <text className="text-2xl font-semibold tracking-tight text-muted-foreground">{`${props.err}`}</text>
      <Button size={"lg"} onPointerDown={props.retry}>
        Retry
      </Button>
    </div>
  );
}
