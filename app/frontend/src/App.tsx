import { Outlet } from "react-router-dom";
import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { ThemeProvider } from "./components/theme-provider";
import { cn, useStateProducer } from "./lib/utils";
import { AppSidebar } from "./components/app-sidebar";
import { useShallow } from "zustand/shallow";
import { usePlaylistStore } from "./state/playlistStore";
import { ScrollProvider } from "./ScrollContext";
import { DownloadOverlay } from "./components/DownloadOverlay";
import { SidebarInset, SidebarProvider } from "./components/ui/sidebar";
import { Button } from "./components/ui/button";
import { ClosePrefsDB, DevModeEnabled, ForcePanic } from "wailsjs/go/main/App";
import { ExpandIcon } from "lucide-react";
import { useDownloadStoreListener, useStoreInitializers } from "./state/useStoreInitializers";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./components/ui/dialog";
import { GetAppUpdate, DismissUpdate } from "wailsjs/go/main/App"
import { types } from "wailsjs/go/models";
import { BrowserOpenURL } from "wailsjs/runtime/runtime";

function App() {

  useStoreInitializers();

  const playlists = usePlaylistStore(
    useShallow((state) => Object.values(state.playlists).flatMap((it) => it))
  );
  const refreshAllPlaylists = usePlaylistStore((state) => state.init);
  const deletePlaylist = usePlaylistStore((state) => state.delete);

  const { expanded, queued } = useDownloadStoreListener();

  const scrollAreaRef = useRef<HTMLDivElement | null>(null);

  return (
    <ThemeProvider defaultTheme="dark">
      <DevModeOverlay>
        <div className="bg-background max-h-screen overflow-hidden flex flex-col">
          <SidebarProvider>
            <AppSidebar
              refreshPlaylist={refreshAllPlaylists}
              playlists={playlists}
              onDeletePlaylist={deletePlaylist}
            />
            <SidebarInset className="overflow-hidden">
              <DownloadOverlay />
              <AppUpdateDialog />
              <ScrollProvider provideRef={scrollAreaRef}>
                <div
                  id="main"
                  ref={scrollAreaRef}
                  className={cn(
                    !expanded && queued > 0
                      ? "max-h-[calc(100vh-30px)]"
                      : "max-h-[calc(100vh)]",
                    "overflow-y-auto overflow-x-hidden"
                  )}
                >
                  <Outlet />
                </div>
              </ScrollProvider>
            </SidebarInset>
          </SidebarProvider>
        </div>
      </DevModeOverlay>
    </ThemeProvider>
  );
}

function AppUpdateDialog() {

  const [visible, setVisible] = useState(false)
  const update = useStateProducer<types.AppUpdate | undefined>(
    undefined,
    async (update) => {
      GetAppUpdate().then((v) => {
        update(v)
        setVisible(true)
      })
    }
  )

  const onOpen = (open: boolean) => {
    if (open) {
      setVisible(true)
    } else {
      DismissUpdate().finally(() => {
        setVisible(false)
      })
    }
  }

  const dateString = useMemo(() => {
    const date = new Date(update?.publishesAt);
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
  }, [update])

  return (
    <Dialog open={visible} onOpenChange={onOpen}>
      <DialogContent className="max-w-xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{update?.version}</DialogTitle>
          <DialogDescription className="">
            New version has been found <br />
            {dateString}
            <a
              onClick={(e) => {
                e.preventDefault();
                if (update?.dlLink) {
                  BrowserOpenURL(update.dlLink);
                }
              }}
              className="block break-all text-primary hover:underline cursor-pointer"
            >
              {update?.dlLink?.replace("https://api.github.com/repos/", "")}
            </a>
          </DialogDescription>
        </DialogHeader>
        <p className="break-words">
          <h1>Release Notes</h1> <br />
          <span className="block whitespace-pre-wrap">{update?.releaseNotes}</span>
        </p>
      </DialogContent>
    </Dialog>
  )
}

function DevModeOverlay({ children }: { children: ReactNode }) {
  const [devMode, setDevMode] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    DevModeEnabled()
      .then(setDevMode)
      .catch(() => setDevMode(false));
  }, []);

  if (!devMode) {
    return <>{children}</>;
  }

  return (
    <div>
      <div className="flex flex-row z-99 absolute top-0">
        <Button size={"icon"} onClick={() => setCollapsed((c) => !c)}>
          <ExpandIcon />
        </Button>
        {collapsed ? undefined : (
          <div className="space-x-2 space-y-2">
            <Button onClick={() => ClosePrefsDB()}>Close DB</Button>
            <Button onClick={() => ForcePanic()}>Force Panic</Button>
          </div>
        )}
      </div>
      {children}
    </div>
  );
}

export default App;
