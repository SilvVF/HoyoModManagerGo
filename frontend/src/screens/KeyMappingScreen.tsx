import { useKeyMapperStore } from "@/state/keymapperStore";
import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { useShallow } from "zustand/shallow";

export function KeymappingScreen() {
    const { modId } = useParams();
    const load = useKeyMapperStore(state => state.load)
    const unload = useKeyMapperStore(state => state.unload)
    // const write = useKeyMapperStore(state => state.write)

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
        <div>
            {modId}
            <div className="flex flex-col">
                {
                    keymap.map((bind) => {
                        return (
                            <div>{bind.name + " - " + bind.key}</div>
                        )
                    })
                }
            </div>
        </div>
    )
}