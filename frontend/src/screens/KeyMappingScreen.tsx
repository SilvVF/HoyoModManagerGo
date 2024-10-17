import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useKeyMapperStore } from "@/state/keymapperStore";
import { ScrollArea } from "@radix-ui/react-scroll-area";
import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { useShallow } from "zustand/shallow";

export function KeymappingScreen() {
    const { modId } = useParams();
    const load = useKeyMapperStore(state => state.load)
    const unload = useKeyMapperStore(state => state.unload)
    const save = useKeyMapperStore(state => state.save)
    const write = useKeyMapperStore(state => state.write)

    const saved = useKeyMapperStore(useShallow(state => state.backups))

    const keymap = useKeyMapperStore(useShallow(state => state.keymappings))

    useEffect(() => {
        try {
            load(Number(modId))
        } catch{}

        return () => {
            unload()
        }
    }, [modId])

    return (
        <div className="w-full h-full p-12">
            <ScrollArea className="max-h-200 w-full">
                {
                    saved.map((path) => {
                        return <div className="text-lg">{path}</div>
                    })
                }
            </ScrollArea>
            <Button onClick={save}>
                Save
            </Button>
            {
                keymap.map((bind) => {
                    return (
                        <div className="flex flex-row items-center justify-start space-x-2 m-4">
                            <div>{bind.name}</div>
                            <Input 
                            value={bind.key} 
                            className="w-32"
                            onKeyDown={(event) => write(bind.name, event.keyCode)}
                            readOnly
                            >
                            </Input>
                        </div>
                    )
                })
            }
        </div>
    )
}