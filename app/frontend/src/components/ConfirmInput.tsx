import { ReactElement, useEffect, useMemo, useState } from "react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { CheckIcon, XIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function ConfirmInput<T>({ className, value, Label, changeValue, getInput: getInput, getValue, type }: {
    className?: string,
    value: T,
    getInput: (value: T) => string | number | undefined,
    getValue: (value: string) => T;
    changeValue: (value: T) => void,
    Label?: ReactElement;
    type?: React.HTMLInputTypeAttribute | undefined
}) {

    const [curr, setCurr] = useState(value);
    useEffect(() => { setCurr(value) }, [value])

    const handleIdChange = (event: any) => {
        try {
            setCurr(getValue(event.target.value))
        } catch { }
    }
    const onChange = (changed: T, accepted: boolean) => {
        if (accepted) {
            changeValue(changed)
        } else {
            setCurr(changed)
        }
    }

    const idChanged = useMemo(() => value !== curr, [curr, value])

    return (
        <div className={cn(className, "flex flex-row space-x-2 items-center w-fit")}>
            {Label}
            <Input type={type} className="min-w-fit" value={getInput(curr)} onInput={handleIdChange} />
            {idChanged ? (
                <div className="space-x-2 flex flex-row" onPointerDown={() => onChange(value, false)}>
                    <Button size='icon'>
                        <XIcon />
                    </Button>
                    <Button size='icon' onPointerDown={() => onChange(curr, true)}>
                        <CheckIcon />
                    </Button>
                </div>
            ) : undefined}
        </div>
    )
}
