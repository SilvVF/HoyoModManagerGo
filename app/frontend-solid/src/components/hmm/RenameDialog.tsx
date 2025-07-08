import { createSignal } from "solid-js";
import {
  DialogCloseButton,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { TextField } from "../ui/text-field";
import { Button } from "../ui/button";

export function NameDialogContent(props: {
  title: string;
  description: string;
  onSuccess: (name: string) => void;
}) {
  let textRef!: HTMLInputElement;

  return (
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>{props.title}</DialogTitle>
        <DialogDescription>{props.description}</DialogDescription>
      </DialogHeader>
      <div class="flex items-center space-x-2">
        <div class="grid flex-1 gap-2">
          <TextField ref={textRef} defaultValue="" />
        </div>
      </div>
      <DialogFooter class="sm:justify-start">
        <DialogCloseButton type="button">Cancel</DialogCloseButton>
        <DialogCloseButton onPointerDown={() => props.onSuccess(textRef.value)}>
          Confirm
        </DialogCloseButton>
      </DialogFooter>
    </DialogContent>
  );
}
