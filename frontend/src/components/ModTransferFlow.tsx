import { formatBytes } from "@/lib/tsutils"
import { TransferState, useModTransferStore } from "@/state/modTransferStore"
import { ChartItem } from "@/state/useStatsState"
import { useCallback } from "react"
import { useShallow } from "zustand/shallow"
import { SettingsDirItem } from "./SettingsDirItem"
import { Button } from "./ui/button"
import { Card } from "./ui/card"
import { DialogHeader, DialogFooter, Dialog, DialogContent, DialogTitle, DialogDescription } from "./ui/dialog"
import { Skeleton } from "./ui/skeleton"
import { SizeChart } from "@/screens/SettingsScreen"
import { Progress } from "./ui/progress"

export const transferText: {
    [key in TransferState]: {
        title: string,
        description: string,
    }
} = {
    confirm: {
        title: "Confirm transfer",
        description: "would you like to transfer all current mods to the new dest",
    },
    idle: {
        title: "Loading",
        description: "setting up mod transfer",
    },
    loading: {
        title: "Transfer in progress",
        description: "moving all mods to the new destination",
    },
    success: {
        title: "Transfer Complete",
        description: "all mods moved to new destintation",
    },
    error: {
        title: "Failed to transfer",
        description: "an error occured while transfering mods",
    },
    delete: {
        title: "Delete old dir",
        description: "Delete old dir"
    }
}

export type TransferAction = {
    pos: boolean,
    text: string,
    inProgres?: boolean,
    action: () => void
}

export function useModTransferActions(closeDialog: () => void): TransferAction[] {

    const state = useModTransferStore(useShallow(state => state.state))
    const start = useModTransferStore(state => state.start)
    const confirm = useModTransferStore(state => state.confirm)
    const deleting = useModTransferStore(useShallow(state => state.deleting))
    const pendingDelete = useModTransferStore(useShallow(state => state.pendingDelete))
    const clearOldDir = useModTransferStore(useShallow(state => state.clearOldDir))

    if (state === "loading") {
        return []
    } else if (state === "confirm") {
        return [
            { pos: false, text: "Cancel", action: closeDialog },
            { pos: true, text: "Set without Transfer", action: () => confirm(false) },
            { pos: true, text: "Transfer", action: () => confirm(true) },
        ]
    } else if (state === "success") {
        return [
            { pos: false, text: "Delete old directory", action: clearOldDir, inProgres: deleting },
            { pos: true, text: "Continue without deleting", action: closeDialog },
        ]
    } else if (state === "error") {
        return [
            { pos: false, text: "Cancel", action: closeDialog },
            { pos: true, text: "Retry", action: () => start }
        ]
    } else if (state === "delete" && pendingDelete !== undefined) {
        return [
            { pos: false, text: "Continue without deleting", action: closeDialog },
            { pos: true, text: "Retry Deleting old directory", action: clearOldDir, inProgres: deleting }
        ]
    } else if (state === "delete" && pendingDelete === undefined) {
        return [
            { pos: true, text: "Complete", action: closeDialog },
        ]
    }
    return [{ pos: false, text: "Cancel", action: closeDialog }]
}

export function MigrateModsDirDialog(
    { open, onOpenChange, stats }: {
        open: boolean,
        onOpenChange: (open: boolean) => void,
        stats: ChartItem | undefined
    }
) {

    const state = useModTransferStore(state => state.state)
    const actions = useModTransferActions(() => onOpenChange(false))

    const handleOpenChange = useCallback((open: boolean) => {
        if (state === "success" || state === "error" || state === "idle") {
            onOpenChange(open)
        }
    }, [state])

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="max-w-[60%] min-h-[80%]">
                <DialogHeader>
                    <DialogTitle>
                        {transferText[state]["title"]}
                    </DialogTitle>
                    <DialogDescription>
                        {transferText[state]["description"]}
                    </DialogDescription>
                </DialogHeader>
                <Card className="w-[100%] h-[60vh] overflow-auto">
                    <MigrateModsContent state={state} stats={stats} />
                </Card>
                <DialogFooter className="sm:justify-start">
                    {actions.map((action) => {
                        return (
                            <Button
                                type="button"
                                variant={action.pos ? "default" : "destructive"}
                                onClick={action.action}
                            >
                                {action.text}
                            </Button>
                        )

                    })}
                </DialogFooter>
            </DialogContent>
        </Dialog >
    )
}

export function MigrateModsContent({ state, stats }: { state: TransferState, stats: ChartItem | undefined }) {

    const { prevDir, newDir } = useModTransferStore(
        useShallow((state) => ({ prevDir: state.prevDir, newDir: state.newDir }))
    )
    const progress = useModTransferStore(
        useShallow((state) => state.progress)
    )
    const pendingDelete = useModTransferStore(
        useShallow((state) => state.pendingDelete)
    )

    if (state === "idle") {
        return (
            <Skeleton className="w-96 h-96" />
        )
    } else if (state === "confirm") {
        return (
            <div className="flex flex-row h-fit">
                <div className="flex flex-col">
                    <p className="p-6 text-lg font-semibold">
                        Confirm whether you want to transfer the mods from<> </>
                        <span className="text-primary font-bold">Current location </span> to<> </>
                        <span className="text-primary font-bold">New Location </span>.
                        This transfer will copy all mods to<> </>
                        <span className="text-primary font-bold">New Location</span> and<> </>
                        <span className="underline">prompt you to clear</span> the old folder after a successful transfer.
                        If you don't want to transfer, you can<> </>
                        <span className="underline">manually set the destination</span><> </>and move the mods yourself.
                    </p>
                    <SettingsDirItem
                        name="Current location"
                        dir={prevDir}
                    />
                    <SettingsDirItem
                        name="New location"
                        dir={newDir}
                    />
                </div>
                {stats ? <SizeChart item={stats} /> : undefined}
            </div>
        )
    } else if (state === "loading") {
        return (
            <div className="flex flex-col h-full w-full justify-center items-center p-4">
                <div className="flex flex-row items-center w-full justify-start space-x-2">
                    <Progress
                        value={
                            progress.total !== 0 ? (progress.progress / progress.total) * 100 : 0
                        }
                        className="w-[75%] h-6"
                    />
                    <div className="flex flex-col">
                        <div>{"Transfering mods"}</div>
                        <div className="text-sm">{`${formatBytes(
                            progress.progress
                        )} / ${formatBytes(progress.total)}`}</div>
                    </div>
                </div>
            </div>
        )
    } else if (state === "success") {
        return (
            <div className="flex flex-col h-full min-w-full justify-center items-center">
                <text className="text-xl font-semibold">Successfully moved mods dir</text>
                <SettingsDirItem
                    name="Root Mods dir"
                    dir={prevDir}
                />
                <text className="p-6">
                    Select whether to delete<> </>
                    <span className="text-primary font-bold">{pendingDelete}</span> <br></br>Otherwise select continue without deleting and manually delete it
                </text>
            </div>
        )
    } else if (state === "error") {
        return (
            <div className="flex flex-col h-full min-w-full justify-center items-center">
                <text className="text-xl font-semibold">
                    An error occured while transfering.
                </text>
            </div>
        )
    } else if (state === "delete") {

        if (pendingDelete) {
            return (
                <div className="flex flex-col h-full min-w-full justify-center items-center">
                    <text className="text-xl font-semibold">
                        An error occured while trying to delete the dir.
                    </text>
                </div>
            )
        } else {
            return (
                <div className="flex flex-col h-full min-w-full justify-center items-center">
                    <text className="text-xl font-semibold">
                        Successfully deleted old dir.
                    </text>
                </div>
            )
        }
    }
    return <></>
}
