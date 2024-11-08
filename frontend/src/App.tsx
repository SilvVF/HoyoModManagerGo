import { Outlet, useNavigate } from "react-router-dom";
import {
  useEffect,
  useRef,
} from "react";
import { ThemeProvider } from "./components/theme-provider";
import { cn } from "./lib/utils";
import { Sidebar } from "./components/sidebar";
import {
  useDownloadStore,
} from "./state/downloadStore";
import { useShallow } from "zustand/shallow";
import { usePlaylistStore } from "./state/playlistStore";
import { useServerStore } from "./state/serverStore";
import { ScrollProvider } from "./ScrollContext";
import { DownloadOverlay } from "./components/DownloadOverlay";

function App() {
  const navigate = useNavigate();
  useEffect(() => navigate("/genshin"), []);

  const subscribe = useDownloadStore((state) => state.subscribe);
  const updateQueue = useDownloadStore((state) => state.updateQueue);
  const running = useDownloadStore((state) => state.running);
  const expanded = useDownloadStore((state) => state.expanded);
  const downloadsInQueue = useDownloadStore(
    useShallow((state) => (Object.keys(state.downloads) as Array<any>).length)
  );

  const playlists = usePlaylistStore(
    useShallow((state) => Object.values(state.playlists).flatMap((it) => it))
  );
  const refreshAllPlaylists = usePlaylistStore((state) => state.init);
  const deletePlaylist = usePlaylistStore((state) => state.delete);

  const listen = useServerStore((state) => state.listen);
  useEffect(() => {
    const cancelFunc = listen();

    return () => {
      cancelFunc();
    };
  }, []);

  useEffect(() => {
    refreshAllPlaylists();
  }, []);

  useEffect(() => {
    const listener = subscribe();
    return () => {
      listener();
    };
  }, []);

  useEffect(() => {
    updateQueue().catch();

    if (running <= 0) return;

    const interval = setInterval(() => {
      updateQueue().catch();
    }, 500);
    return () => {
      clearInterval(interval);
    };
  }, [running]);

  const scrollAreaRef = useRef<HTMLDivElement | null>(null);

  return (
    <ThemeProvider defaultTheme="dark">
      <div className="bg-background max-h-screen overflow-hidden flex flex-col">
        <DownloadOverlay />
        <div className="grid lg:grid-cols-5">
          <Sidebar
            refreshPlaylist={refreshAllPlaylists}
            playlists={playlists}
            onDeletePlaylist={deletePlaylist}
            className="hidden lg:block max-h-screen overflow-hidden"
          />
          <div
            className={cn(
              `col-span-3 lg:col-span-4 lg:border-l`,
              !expanded && downloadsInQueue >= 1
                ? "max-h-[calc(100vh-30px)]"
                : "max-h-[calc(100vh)]"
            )}
          >
            <div
              ref={scrollAreaRef}
              className={`h-full overflow-y-auto overflow-x-hidden`}
            >
              <ScrollProvider provideRef={scrollAreaRef}>
                <Outlet />
              </ScrollProvider>
            </div>
          </div>
        </div>
      </div>
    </ThemeProvider>
  );
}

export default App;
