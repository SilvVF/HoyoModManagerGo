import {
  CheckCheckIcon,
  ChevronDown,
  PencilIcon,
  Trash,
  ViewIcon,
} from "lucide-react";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Separator } from "./ui/separator";
import { ScrollArea } from "./ui/scroll-area";
import { Card } from "./ui/card";
import { Switch } from "./ui/switch";
import { types } from "wailsjs/go/models";
import { ReactElement, useState } from "react";
import { DialogTrigger } from "@radix-ui/react-dialog";
export interface CharacterInfoCardProps {
  cmt: types.CharacterWithModsAndTags;
  enableMod: (id: number, enabled: boolean) => void;
  enableTexture: (id: number, enabled: boolean) => void;
  modDropdownMenu: (mwt: types.ModWithTags) => ReactElement | undefined;
  textureDropdownMenu: (texture: types.Texture) => ReactElement | undefined;
}

export function CharacterInfoCard({
  cmt,
  modDropdownMenu,
  textureDropdownMenu,
  enableMod,
  enableTexture,
}: CharacterInfoCardProps) {
  const character: types.Character = cmt.characters;
  const [showT, setShowT] = useState(true);

  return (
    <Card className="m-2">
      <div className="flex flex-row m-2">
        <div className="flex flex-col items-start">
          <img src={character.avatarUrl} alt={`${character.name} Avatar`} />
          <b className="text-lg p-2">{character.name}</b>
        </div>
        <ScrollArea className="max-h-[300px] w-full">
          {cmt.modWithTags.map((mwt) => (
            <div key={mwt.mod.id} className="flex flex-col">
              <div className="grid grid-cols-5 overflow-hidden items-center">
                <b className="col-span-3 w-full text-sm my-1 text-ellipsis overflow-x-hidden pe-1">
                  {mwt.mod.filename}
                </b>
                <Switch
                  className="col-span-1 my-1"
                  checked={mwt.mod.enabled}
                  onCheckedChange={() =>
                    enableMod(mwt.mod.id, !mwt.mod.enabled)
                  }
                />
                <div className="flex flex-row">
                  {modDropdownMenu(mwt)}
                  {mwt.textures.length > 0 ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowT((p) => !p)}
                      className={showT ? "rotate-180" : "rotate-0"}
                    >
                      <ChevronDown />
                    </Button>
                  ) : undefined}
                </div>
              </div>
              {showT && mwt.textures.length > 0 ? (
                <div className="slide-in fade-out flex flex-col">
                  <div className="text-sm">{`Textures for ${mwt.mod.filename}`}</div>
                  {mwt.textures.map((t) => {
                    return (
                      <div className="grid grid-cols-5 overflow-hidden items-center">
                        <b className="text-sm col-span-3 w-full my-1 text-ellipsis overflow-x-hidden pe-1">
                          {t.filename}
                        </b>
                        <Switch
                          className="col-span-1 my-1"
                          checked={t.enabled}
                          onCheckedChange={() =>
                            enableTexture(t.id, !t.enabled)
                          }
                        />
                        {textureDropdownMenu(t)}
                      </div>
                    );
                  })}
                  <Separator className="my-1" />
                </div>
              ) : undefined}
            </div>
          ))}
        </ScrollArea>
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
