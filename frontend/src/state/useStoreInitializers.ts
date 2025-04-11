import { useEffect } from "react"
import { useDownloadStore } from "./downloadStore";
import { usePluginStore } from "./pluginStore";
import { useServerStore } from "./serverStore";
import { usePlaylistStore } from "./playlistStore";
import { useShallow } from "zustand/react/shallow";
import { useModTransferStore } from "./modTransferStore";

export const useStoreInitializers = () => {

    const listenForDownloads = useDownloadStore((state) => state.subscribe);
    const listenToPluginEvents = usePluginStore((state) => state.listen);
    const listenForServerEvents = useServerStore((state) => state.listen);
    const refreshAllPlaylists = usePlaylistStore((state) => state.init);
    const listenForTransferEvents = useModTransferStore((state) => state.listen)

    useEffect(() => {

        refreshAllPlaylists().catch();

        const unregisterPluginEvents = listenToPluginEvents();
        const unregisterDownloads = listenForDownloads();
        const unregisterServerEvents = listenForServerEvents();
        const unregisterTransferEvents = listenForTransferEvents();

        return () => {
            unregisterPluginEvents();
            unregisterDownloads();
            unregisterServerEvents();
            unregisterTransferEvents();
        };
    }, []);
}

export const useDownloadStoreListener = () => {

    const running = useDownloadStore((state) => state.running);
    const updateQueue = useDownloadStore((state) => state.updateQueue);
    const expanded = useDownloadStore((state) => state.expanded);
    const downloadsInQueue = useDownloadStore(
        useShallow((state) => Object.keys(state.downloads).length)
    );


    useEffect(() => {
        updateQueue().catch();

        if (running <= 0) return;

        const interval = setInterval(() => {
            updateQueue().catch();
        }, 200);
        return () => {
            clearInterval(interval);
        };
    }, [running]);

    return {
        expanded: expanded,
        queued: downloadsInQueue
    }
}