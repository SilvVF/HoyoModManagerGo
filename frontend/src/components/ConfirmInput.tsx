import { ReactElement, useMemo, useState } from "react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { CheckIcon, XIcon } from "lucide-react";

export function ConfirmInput<T>({ className, value, Label, changeValue, getInput: getInput, getValue, type }: {
    className?: string,
    value: T,
    getInput: (value: T) => string | number | undefined,
    getValue: (value: string) => T;
    changeValue: (value: T) => Promise<void>,
    Label?: ReactElement;
    type?: React.HTMLInputTypeAttribute | undefined
}) {

    const [curr, setCurr] = useState(value);
    const idChanged = useMemo(() => value != curr, [value, curr])

    const handleIdChange = (event: any) => {
        try {
            setCurr(getValue(event.target.value))
        } catch { }
    }
    const onChange = (changed: T, accepted: boolean) => {
        if (accepted) {
            changeValue(changed)
                .then(() => setCurr(changed))
                .catch(() => setCurr(value))
        } else {
            setCurr(value)
        }
    }

    return (
        <div className="flex flex-row space-x-2 items-center">
            {Label}
            <Input type={type} className={className} value={getInput(curr)} onInput={handleIdChange} />
            {idChanged ? (
                <div className="space-x-2" onPointerDown={() => onChange(value, false)}>
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
