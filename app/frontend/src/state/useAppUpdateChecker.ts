import { useDialogStore } from "@/components/appdialog"
import { useEffect } from "react"
import { DismissUpdate, GetAppUpdate } from "wailsjs/go/main/App"
import { types } from "wailsjs/go/models"
import { useShallow } from "zustand/shallow"

const dateString = (update: types.AppUpdate) => {
    const date = new Date(update.publishesAt);
    const formatted = date.toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
        timeZoneName: "short"
    });

    return formatted
}

export const useAppUpdateChecker = () => {

    const setDialog = useDialogStore(useShallow(s => s.setDialog))

    useEffect(() => {
        GetAppUpdate().then((update) => {
            setDialog({
                type: "app_update",
                update: update,
                date: dateString(update),
                onDismiss: () => {
                    DismissUpdate().catch()
                }
            })
        })
    }, [])
}