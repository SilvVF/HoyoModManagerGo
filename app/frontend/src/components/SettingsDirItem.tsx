import { EditIcon } from "lucide-react";
import { Button } from "./ui/button";

export function SettingsDirItem(props: {
    name: string;
    setDir?: (() => void);
    dir: string | undefined;
}) {
    return (
        <div className="flex flex-row justify-between items-center m-2 rounded-lg hover:bg-primary-foreground">
            <div className="flex flex-col m-2">
                <h2 className="space-y-1 text-primary">{props.name}</h2>
                <div className="text-zinc-500">{props.dir?.ifEmpty(() => "unset")}</div>
            </div>
            {props.setDir ?
                <Button size="icon" className="mx-2" onPointerDown={props.setDir}>
                    <EditIcon />
                </Button> : undefined
            }
        </div>
    );
}
