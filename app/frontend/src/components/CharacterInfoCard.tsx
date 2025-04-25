import { DialogTrigger } from "@radix-ui/react-dialog";
import {
  CheckCheckIcon,
  ChevronDown,
  PencilIcon,
  Trash,
  ViewIcon,
} from "lucide-react";
import React, { HTMLAttributes, ReactElement, useEffect, useRef, useState } from "react";
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
export interface CharacterInfoCardProps extends HTMLAttributes<HTMLDivElement> {
  cmt: types.CharacterWithModsAndTags;
  enableMod: (id: number, enabled: boolean) => void;
  enableTexture: (id: number, enabled: boolean) => void;
  modDropdownMenu: (mwt: types.ModWithTags) => ReactElement | undefined;
  textureDropdownMenu: (texture: types.Texture) => ReactElement | undefined;
  onLongPress?: (event: LongPressEvent) => void
}

const TextDisplay = ({ text, availableSpace }: { text: string, availableSpace: number }) => {
  const [isOverflowing, setIsOverflowing] = useState(false);
  const textRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (textRef.current) {
      setIsOverflowing(textRef.current.scrollWidth > availableSpace);
    }
  }, [text, availableSpace]);

  return (
    <div className="overflow-hidden whitespace-nowrap" style={{ maxWidth: availableSpace }}>
      <div className={cn("inline-block", isOverflowing ? "animate-marquee" : "")}>
        <span ref={textRef} className="inline-block text-sm">  {text}</span>
        {isOverflowing ? <span className="inline-block text-sm px-4">  {text}</span> : undefined}
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
  hasTextures = false,
  isTexture = false
}: {
  id: number,
  filename: string,
  showT: boolean,
  setShowT: React.Dispatch<React.SetStateAction<boolean>>
  enableFn: (id: number, enabled: boolean) => void,
  enabled: boolean,
  dropdownMenu: React.ReactNode,
  hasTextures?: boolean,
  isTexture?: boolean
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
    <div ref={rowRef} className="flex flex-row items-center w-full">
      <div className="flex-grow overflow-hidden mr-2">
        <TextDisplay
          text={filename}
          availableSpace={availableWidth}
        />
      </div>

      <div ref={controlRef} className="flex flex-row items-center space-x-1 flex-shrink-0">
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
            onClick={() => setShowT(prev => !prev)}
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
    LogDebug("Long pressed" + cmt.characters.id)
    if (onLongPress) {
      onLongPress(e)
    }
  })

  return (
    <Card
      className="w-full"
      {...characterCardLongPressProps}
      {...props}
    >
      <div className="flex flex-row m-2 w-full">
        <div className="w-1/3 pr-2 flex flex-col items-center">
          <img
            src={character.avatarUrl}
            alt={`${character.name} Avatar`}
            className="w-full aspect-square object-cover rounded-md"
          />
          <b className="text-lg p-2 text-center truncate w-full">{character.name}</b>
        </div>
        <div className="w-2/3 overflow-hidden  overflow-y-auto me-2">
          <div className="max-h-[300px] w-full">
            {cmt.modWithTags.map((mwt) => (
              <div key={mwt.mod.id} className="flex flex-col mb-2">
                <ModRow
                  id={mwt.mod.id}
                  showT={showT}
                  setShowT={setShowT}
                  filename={mwt.mod.filename}
                  enableFn={enableMod}
                  enabled={mwt.mod.enabled}
                  dropdownMenu={modDropdownMenu(mwt)}
                  hasTextures={mwt.textures.length > 0}
                />
                {showT && mwt.textures.length > 0 && (
                  <div className="slide-in-from-top flex flex-col">
                    <div className="text-sm font-semibold my-1">{`Textures for ${mwt.mod.filename}`}</div>
                    {mwt.textures.map((t) => (
                      <ModRow
                        key={t.id}
                        id={t.id}
                        showT={showT}
                        setShowT={setShowT}
                        filename={t.filename}
                        enableFn={enableTexture}
                        enabled={t.enabled}
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
}) {
  const [isOpen, setOpen] = useState(false);

  return (
    <DropdownMenu open={isOpen} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button className="col-span-1" variant={"ghost"} size="icon">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <circle cx="12" cy="12" r="1" />
            <circle cx="12" cy="5" r="1" />
            <circle cx="12" cy="19" r="1" />
          </svg>
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
}) {
  const [isOpen, setOpen] = useState(false);

  return (
    <DropdownMenu open={isOpen} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button className="col-span-1" variant={"ghost"} size="icon">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <circle cx="12" cy="12" r="1" />
            <circle cx="12" cy="5" r="1" />
            <circle cx="12" cy="19" r="1" />
          </svg>
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
        {props.onKeymapEdit ? (
          <DropdownMenuItem onClick={props.onKeymapEdit}>
            <CheckCheckIcon className="mr-2 h-4 w-4" />
            <span className="w-full">Edit</span>
            <DropdownMenuShortcut>⇧e</DropdownMenuShortcut>
          </DropdownMenuItem>
        ) : undefined}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
