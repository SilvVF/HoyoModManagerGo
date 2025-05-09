import { useState } from "react";
import { Button } from "./ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Input } from "./ui/input";

export function NameDialog(props: {
    title: string;
    description: string;
    onSuccess: (name: string) => void;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const [inputValue, setInputValue] = useState("");
    const handleChange = (event: any) => {
        setInputValue(event.target.value);
    };

    return (
        <Dialog open={props.open} onOpenChange={props.onOpenChange}>
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
                <DialogFooter className="sm:justify-start">
                    <DialogClose asChild>
                        <Button type="button" variant="secondary">
                            Cancel
                        </Button>
                    </DialogClose>
                    <DialogClose asChild>
                        <Button
                            onPointerDown={() => props.onSuccess(inputValue)}
                            type="button"
                            variant="secondary"
                        >
                            Confirm
                        </Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export function NameDialogContent(props: {
    title: string;
    description: string;
    onSuccess: (name: string) => void;
}) {

    const [inputValue, setInputValue] = useState("");
    const handleChange = (event: any) => {
        setInputValue(event.target.value);
    };

    return (
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
                        defaultValue=""
                    />
                </div>
            </div>
            <DialogFooter className="sm:justify-start">
                <DialogClose asChild>
                    <Button type="button" variant="secondary">
                        Cancel
                    </Button>
                </DialogClose>
                <DialogClose asChild>
                    <Button
                        onPointerDown={() => props.onSuccess(inputValue)}
                        type="button"
                        variant="secondary"
                    >
                        Confirm
                    </Button>
                </DialogClose>
            </DialogFooter>
        </DialogContent>
    );
}