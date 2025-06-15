import { types } from "wailsjs/go/models";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { create } from "zustand";
import { useShallow } from "zustand/shallow";
import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { imageFileExtensions, isValidUrl } from "@/lib/tsutils";
import { OpenFileDialog } from "wailsjs/go/main/App";
import { ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { BrowserOpenURL } from "wailsjs/runtime/runtime";
import DB from "@/data/database";

const DialogConfig: {
  [key in AppDialogType["type"]]: { title: string; description: string };
} = {
  rename_mod: {
    title: "Rename mod",
    description:
      "rename the current mod (this will change the folder name in files)",
  },
  rename_texture: {
    title: "Rename Texture",
    description:
      "rename the current texture (this will change the folder name in files)",
  },
  add_tag: {
    title: "Add a tag",
    description: "add a tag that can be used to search and filter",
  },
  add_character: {
    title: "Add a custom character",
    description:
      "Adds an additional character to the database with the selected name and image (can be a local file but path must not change)",
  },
  add_tag_multi: {
    title: "Add a tag to all mods",
    description: "Adds a tags to all mods in multiselected characters",
  },
  set_mod_image: {
    title: "Add image url",
    description: "input a url to add to the mod",
  },
  app_update: {
    title: "",
    description: "",
  },
};

export type AppDialogType =
  | {
      type: "rename_mod";
      refresh: () => void;
      id: number;
    }
  | {
      type: "rename_texture";
      refresh: () => void;
      id: number;
    }
  | {
      type: "add_character";
      game: number;
      elements: string[];
      refresh: () => void;
    }
  | {
      type: "add_tag_multi";
      game: number;
      refresh: () => void;
      selectedChars: types.Character[];
    }
  | {
      type: "add_tag";
      refresh: () => void;
      mod: types.Mod;
    }
  | {
      type: "set_mod_image";
      refresh: () => void;
      mod: types.Mod;
    }
  | {
      type: "app_update";
      update: types.AppUpdate;
      date: string;
      onDismiss: () => void;
    };

export interface DialogStore {
  dialog: AppDialogType | undefined;
  setDialog: (dialog: AppDialogType | undefined) => void;
}

export const useDialogStore = create<DialogStore>((set) => ({
  dialog: undefined,
  setDialog: (dialog: AppDialogType | undefined) => {
    set({
      dialog: dialog,
    });
  },
}));

export default function AppDialogHost({ children }: { children: ReactNode }) {
  const dialog = useDialogStore(useShallow((s) => s.dialog));
  const setDialog = useDialogStore(useShallow((s) => s.setDialog));

  const config = useMemo(
    () => (dialog ? DialogConfig[dialog.type] : undefined),
    [dialog],
  );

  return (
    <Dialog
      open={dialog !== undefined}
      onOpenChange={() => setDialog(undefined)}
    >
      <DialogContent>
        <DialogTitle>{config?.title}</DialogTitle>
        <DialogDescription>{config?.description}</DialogDescription>
        <AppDialogContent dialog={dialog} />
      </DialogContent>
      {children}
    </Dialog>
  );
}

function AppDialogContent({ dialog }: { dialog: AppDialogType | undefined }) {
  if (dialog === undefined) return undefined;

  switch (dialog.type) {
    case "rename_mod":
      return (
        <RenameDialog
          onSuccess={(name) =>
            DB.renameMod(dialog.id, name).then(dialog.refresh)
          }
        />
      );
    case "rename_texture":
      return (
        <RenameDialog
          onSuccess={(name) =>
            DB.renameTexture(dialog.id, name).then(dialog.refresh)
          }
        />
      );
    case "add_character":
      return (
        <AddCharacterDialog
          elements={dialog.elements}
          createCharacter={(name, image, selectedElement) => {
            DB.createCustomCharacter(
              name,
              image,
              selectedElement ?? "",
              dialog.game,
            ).then(dialog.refresh);
          }}
        />
      );
    case "add_tag_multi":
      return (
        <AddTagMultiDialog
          selectedChars={dialog.selectedChars}
          game={dialog.game}
          refreshCharacters={dialog.refresh}
        />
      );
    case "add_tag":
      return (
        <RenameDialog
          onSuccess={(name) => {
            DB.insertTag(dialog.mod.id, name);
          }}
        />
      );
    case "set_mod_image":
      return (
        <RenameDialog
          onSuccess={(url) => {
            if (isValidUrl(url)) {
              const set = new Set(dialog.mod.previewImages);
              set.add(url);
              DB.updateModImages(dialog.mod.id, Array.from(set)).then(
                dialog.refresh,
              );
            }
          }}
        />
      );
    case "app_update":
      return <AppUpdateDialog {...dialog} />;
  }
}

function AppUpdateDialog({
  update,
  date,
  onDismiss,
}: {
  update: types.AppUpdate;
  date: string;
  onDismiss: () => void;
}) {
  useEffect(() => {
    return () => onDismiss();
  });

  return (
    <div>
      <h1>{update?.version}</h1>
      <p className="">
        New version has been found <br />
        {date}
        <a
          onClick={(e) => {
            e.preventDefault();
            if (update?.dlLink) {
              BrowserOpenURL(update.dlLink);
            }
          }}
          className="block cursor-pointer break-all text-primary hover:underline"
        >
          {update?.dlLink?.replace("https://api.github.com/repos/", "")}
        </a>
      </p>
      <p className="break-words">
        <h1>Release Notes</h1> <br />
        <span className="block whitespace-pre-wrap">
          {update?.releaseNotes}
        </span>
      </p>
    </div>
  );
}

function AddTagMultiDialog({
  selectedChars,
  game,
  refreshCharacters,
}: {
  selectedChars: types.Character[];
  game: number;
  refreshCharacters: () => void;
}) {
  const [inputValue, setInputValue] = useState("");
  const handleChange = (event: any) => {
    setInputValue(event.target.value);
  };

  const onConfirmed = () => {
    if (inputValue.isBlank()) {
      return;
    }

    DB.insertTagForAllModsByCharacterIds(
      selectedChars.map((c) => c.id),
      inputValue,
      game,
    ).then(refreshCharacters);
  };

  return (
    <>
      <text>{selectedChars.map((c) => c.name).join(", ")}</text>
      <div className="grid flex-1 gap-2">
        <Input value={inputValue} onChange={handleChange} />
      </div>
      <DialogFooter className="sm:justify-start">
        <DialogClose asChild>
          <Button type="button" variant="secondary">
            Cancel
          </Button>
        </DialogClose>
        <DialogClose asChild>
          <Button onPointerDown={onConfirmed} type="button" variant="secondary">
            Confirm
          </Button>
        </DialogClose>
      </DialogFooter>
    </>
  );
}

function AddCharacterDialog({
  elements,
  createCharacter,
}: {
  elements: string[];
  createCharacter: (
    name: string,
    image: string,
    selectedElement: string | undefined,
  ) => void;
}) {
  const imageInput = useRef<HTMLInputElement>(null);
  const nameInput = useRef<HTMLInputElement>(null);
  const [selectedElement, setSelectedElement] = useState<string | undefined>(
    undefined,
  );

  const onCreateCategory = () => {
    const image = imageInput.current?.value;
    const name = nameInput.current?.value;

    if (image && name) {
      createCharacter(name, image, selectedElement);
    }
  };

  const openImageFilePicker = () => {
    OpenFileDialog("select a category image", imageFileExtensions).then(
      (file) => {
        if (imageInput.current) {
          imageInput.current.value = file;
        }
      },
    );
  };

  return (
    <div className="flex w-full flex-col space-y-1 overflow-clip">
      <text>Name</text>
      <Input ref={nameInput} type="text" className="w-full" />
      <text>Image</text>
      <div className="flex flex-row space-x-2">
        <Input ref={imageInput} type="text" className="w-full" />
        <Button onPointerDown={openImageFilePicker} size={"icon"}>
          <ImageIcon />
        </Button>
      </div>
      <div className="grid grid-cols-4 space-y-2 space-x-2 p-2">
        {elements.map((element) => {
          return (
            <Button
              key={element}
              size={"sm"}
              variant={selectedElement === element ? "secondary" : "outline"}
              className={cn(
                selectedElement === element
                  ? "bg-primary/50 hover:bg-primary/50"
                  : "bg-secondary/40",
                "backdrNop-blur-md rounded-full border-0",
              )}
              onPointerDown={() =>
                setSelectedElement((e) => (element === e ? undefined : element))
              }
            >
              {element}
            </Button>
          );
        })}
      </div>
      <DialogTrigger>
        <Button className="w-full" onPointerDown={onCreateCategory}>
          Create
        </Button>
      </DialogTrigger>
    </div>
  );
}

function RenameDialog({ onSuccess }: { onSuccess: (name: string) => void }) {
  const [inputValue, setInputValue] = useState("");
  const handleChange = (event: any) => {
    setInputValue(event.target.value);
  };

  return (
    <div className="flex items-center space-x-2">
      <div className="grid flex-1 gap-2">
        <Input value={inputValue} onChange={handleChange} defaultValue="" />
      </div>
      <DialogFooter className="sm:justify-start">
        <DialogClose asChild>
          <Button type="button" variant="secondary">
            Cancel
          </Button>
        </DialogClose>
        <DialogClose asChild>
          <Button
            onPointerDown={() => onSuccess(inputValue)}
            type="button"
            variant="secondary"
          >
            Confirm
          </Button>
        </DialogClose>
      </DialogFooter>
    </div>
  );
}
