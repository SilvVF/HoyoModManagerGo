import { DialogTrigger } from "@radix-ui/react-dialog";
import {
  CheckCheckIcon,
  ChevronDown,
  EditIcon,
  EllipsisVertical,
  PencilIcon,
  SplitIcon,
  TagIcon,
  Trash,
  ViewIcon,
} from "lucide-react";
import React, {
  HTMLAttributes,
  ReactElement,
  useEffect,
  useRef,
  useState,
} from "react";
import { types } from "wailsjs/go/models";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Separator } from "./ui/separator";
import { Switch } from "./ui/switch";
import { cn } from "@/lib/utils";
import { LongPressEvent, useLongPress } from "@/hooks/useLongPress";
import { LogDebug } from "wailsjs/runtime/runtime";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "./ui/hover-card";
import AsyncImage from "./AsyncImage";
export interface CharacterInfoCardProps extends HTMLAttributes<HTMLDivElement> {
  cmt: types.CharacterWithModsAndTags;
  enableMod: (id: number, enabled: boolean) => void;
  enableTexture: (id: number, enabled: boolean) => void;
  modDropdownMenu: (mwt: types.ModWithTags) => ReactElement | undefined;
  textureDropdownMenu: (texture: types.Texture) => ReactElement | undefined;
  onLongPress?: (event: LongPressEvent) => void;
}

const TextDisplay = ({
  text,
  availableSpace,
}: {
  text: string;
  availableSpace: number;
}) => {
  const [isOverflowing, setIsOverflowing] = useState(false);
  const textRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (textRef.current) {
      setIsOverflowing(textRef.current.scrollWidth > availableSpace);
    }
  }, [text, availableSpace]);

  return (
    <div
      className="overflow-hidden whitespace-nowrap"
      style={{ maxWidth: availableSpace }}
    >
      <div
        className={cn("inline-block", isOverflowing ? "animate-marquee" : "")}
      >
        <span ref={textRef} className="inline-block text-sm">
          {" "}
          {text}
        </span>
        {isOverflowing ? (
          <span className="inline-block px-4 text-sm"> {text}</span>
        ) : undefined}
      </div>
      <style>{`
      @keyframes marquee {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
      }

        .animate-marquee {
          display: inline-block;
          animation: marquee 6s linear infinite;
        }
      `}</style>
    </div>
  );
};

const ModRow = ({
  id,
  filename,
  showT,
  setShowT,
  enableFn,
  enabled,
  dropdownMenu,
  tags,
  hasTextures = false,
  isTexture = false,
  images = undefined,
}: {
  id: number;
  filename: string;
  tags: string[];
  showT: boolean;
  setShowT: React.Dispatch<React.SetStateAction<boolean>>;
  enableFn: (id: number, enabled: boolean) => void;
  enabled: boolean;
  dropdownMenu: React.ReactNode;
  hasTextures?: boolean;
  isTexture?: boolean;
  images?: string[];
}) => {
  const rowRef = useRef<HTMLDivElement>(null);
  const controlRef = useRef<HTMLDivElement>(null);
  const [availableWidth, setAvailableWidth] = useState(200);

  useEffect(() => {
    let frameId: number;

    const listener = () => {
      cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(() => {
        if (rowRef.current) {
          const rowWidth = rowRef.current.clientWidth;
          const controlsWidth = controlRef.current?.clientWidth ?? 100;
          setAvailableWidth(rowWidth - controlsWidth);
        }
      });
    };

    window.addEventListener("resize", listener);
    listener();

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", listener);
    };
  }, []);

  return (
    <div ref={rowRef} className="flex w-full flex-row items-center">
      <div className="mr-2 flex-grow overflow-hidden">
        <HoverCard>
          <HoverCardTrigger>
            <TextDisplay text={filename} availableSpace={availableWidth} />
          </HoverCardTrigger>
          {(images?.filter((it) => !it.isBlank())?.length ?? 0) > 0 ? (
            <HoverCardContent className="flex w-96 flex-col overflow-clip bg-primary/20 backdrop-blur-md">
              <div>{filename}</div>
              <div>Tags: {tags.join(", ")}</div>
              <div className="flex flex-row space-x-2 overflow-x-auto">
                {images?.map((uri) => (
                  <AsyncImage
                    key={uri}
                    className="m-2 aspect-square h-70 w-70 object-cover"
                    src={uri}
                  />
                ))}
              </div>
            </HoverCardContent>
          ) : (
            <HoverCardContent>No Images for {filename}</HoverCardContent>
          )}
        </HoverCard>
      </div>

      <div
        ref={controlRef}
        className="flex flex-shrink-0 flex-row items-center space-x-1"
      >
        <Switch
          className="my-1"
          checked={enabled}
          onCheckedChange={() => enableFn(id, !enabled)}
        />
        {dropdownMenu}
        {!isTexture && hasTextures && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowT((prev) => !prev)}
            className={`transition-transform ${showT ? "rotate-180" : "rotate-0"}`}
          >
            <ChevronDown />
          </Button>
        )}
      </div>
    </div>
  );
};

export function CharacterInfoCard({
  cmt,
  modDropdownMenu,
  textureDropdownMenu,
  enableMod,
  enableTexture,
  onLongPress,
  ...props
}: CharacterInfoCardProps) {
  const character: types.Character = cmt.characters;
  const [showT, setShowT] = useState(true);

  const characterCardLongPressProps = useLongPress((e) => {
    LogDebug("Long pressed" + cmt.characters.id);
    if (onLongPress) {
      onLongPress(e);
    }
  });

  return (
    <Card className="w-full" {...characterCardLongPressProps} {...props}>
      <div className="m-2 flex w-full flex-row">
        <div className="flex w-1/3 flex-col items-center pr-2">
          <AsyncImage
            src={character.avatarUrl}
            alt={`${character.name} Avatar`}
            className="aspect-square w-full rounded-md object-cover"
          />
          <b className="w-full truncate p-2 text-center text-lg">
            {character.name}
          </b>
        </div>
        <div className="me-2 w-2/3 overflow-hidden overflow-y-auto">
          <div className="max-h-[300px] w-full">
            {cmt.modWithTags.map((mwt) => (
              <div key={mwt.mod.id} className="mb-2 flex flex-col">
                <ModRow
                  id={mwt.mod.id}
                  showT={showT}
                  setShowT={setShowT}
                  filename={mwt.mod.filename}
                  enableFn={enableMod}
                  enabled={mwt.mod.enabled}
                  dropdownMenu={modDropdownMenu(mwt)}
                  tags={mwt.tags.map((t) => t.name)}
                  images={mwt.mod.previewImages}
                  hasTextures={mwt.textures.length > 0}
                />
                {showT && mwt.textures.length > 0 && (
                  <div className="slide-in-from-top flex flex-col">
                    <div className="my-1 text-sm font-semibold">{`Textures for ${mwt.mod.filename}`}</div>
                    {mwt.textures.map((t) => (
                      <ModRow
                        key={t.id}
                        id={t.id}
                        showT={showT}
                        setShowT={setShowT}
                        filename={t.filename}
                        tags={mwt.tags.map((t) => t.name)}
                        enableFn={enableTexture}
                        enabled={t.enabled}
                        images={t.previewImages}
                        dropdownMenu={textureDropdownMenu(t)}
                        isTexture={true}
                      />
                    ))}
                    <Separator className="my-1" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}

export function TextureActionDropDown(props: {
  onDelete: () => void;
  onRename: () => void;
  onView: () => void;
  onEnable: () => void;
  onSplit: () => void;
}) {
  const [isOpen, setOpen] = useState(false);

  return (
    <DropdownMenu open={isOpen} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button className="col-span-1" variant={"ghost"} size="icon">
          <EllipsisVertical />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={props.onDelete}>
          <Trash className="mr-2 h-4 w-4" />
          <span className="w-full">Delete</span>
          <DropdownMenuShortcut>⇧d</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DialogTrigger
          onPointerDown={() => {
            setOpen(false);
            props.onRename();
          }}
        >
          <DropdownMenuItem>
            <PencilIcon className="mr-2 h-4 w-4" />
            <span className="w-full">Rename</span>
            <DropdownMenuShortcut>⇧r</DropdownMenuShortcut>
          </DropdownMenuItem>
        </DialogTrigger>
        <DropdownMenuItem onClick={props.onView}>
          <ViewIcon className="mr-2 h-4 w-4" />
          <span className="w-full">View</span>
          <DropdownMenuShortcut>⇧v</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={props.onEnable}>
          <CheckCheckIcon className="mr-2 h-4 w-4" />
          <span className="w-full">Toggle</span>
          <DropdownMenuShortcut>⇧t</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={props.onSplit}>
          <SplitIcon className="mr-2 h-4 w-4" />
          <span className="w-full">Split</span>
          <DropdownMenuShortcut>⇧s</DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/*
This must be nested within a <Dialog>
issue https://github.com/radix-ui/primitives/issues/1836
*/
export function ModActionsDropDown(props: {
  onDelete: () => void;
  onRename: () => void;
  onView: () => void;
  onEnable: () => void;
  onKeymapEdit?: () => void;
  addTag: () => void;
}) {
  const [isOpen, setOpen] = useState(false);

  return (
    <DropdownMenu open={isOpen} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button className="col-span-1" variant={"ghost"} size="icon">
          <EllipsisVertical />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={props.onDelete}>
          <Trash className="mr-2 h-4 w-4" />
          <span className="w-full">Delete</span>
          <DropdownMenuShortcut>⇧d</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DialogTrigger
          onPointerDown={() => {
            setOpen(false);
            props.onRename();
          }}
        >
          <DropdownMenuItem className="min-w-full">
            <div className="flex flex-row">
              <PencilIcon className="mr-2 h-4 w-4" />
              <div className="flex w-full flex-row items-center justify-end">
                <span className="w-full">Rename</span>
                <DropdownMenuShortcut className="">⇧r</DropdownMenuShortcut>
              </div>
            </div>
          </DropdownMenuItem>
        </DialogTrigger>
        <DropdownMenuItem onClick={props.onView}>
          <ViewIcon className="mr-2 h-4 w-4" />
          <span className="w-full">View</span>
          <DropdownMenuShortcut>⇧v</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={props.onEnable}>
          <CheckCheckIcon className="mr-2 h-4 w-4" />
          <span className="w-full">Toggle</span>
          <DropdownMenuShortcut>⇧t</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={props.addTag}>
          <TagIcon className="mr-2 h-4 w-4" />
          <span className="w-full">Add Tag</span>
          <DropdownMenuShortcut>⇧a</DropdownMenuShortcut>
        </DropdownMenuItem>
        {props.onKeymapEdit ? (
          <DropdownMenuItem onClick={props.onKeymapEdit}>
            <EditIcon className="mr-2 h-4 w-4" />
            <span className="w-full">Edit</span>
            <DropdownMenuShortcut>⇧e</DropdownMenuShortcut>
          </DropdownMenuItem>
        ) : undefined}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
