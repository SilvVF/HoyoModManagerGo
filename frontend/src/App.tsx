import { Outlet, useNavigate } from "react-router-dom";
import { ScrollArea } from "./components/ui/scroll-area";
import { useEffect } from "react";
import { ThemeProvider } from "./components/theme-provider";
import { cn, formatBytes } from "./lib/utils";
import { Sidebar } from "./components/sidebar";
import { Card } from "./components/ui/card";
import {
  CheckCircle2Icon,
  ChevronUpIcon,
  RefreshCwIcon,
  XIcon,
} from "lucide-react";
import { Button } from "./components/ui/button";
import {
  Download,
  DownloadProgress,
  useDownloadStore,
} from "./state/downloadStore";
import { Progress } from "./components/ui/progress";
import { useShallow } from "zustand/shallow";
import { usePlaylistStore } from "./state/playlistStore";

function App() {
  const navigate = useNavigate();
  useEffect(() => navigate("/genshin"), []);

  const subscribe = useDownloadStore((state) => state.subscribe);
  const updateQueue = useDownloadStore((state) => state.updateQueue);
  const running = useDownloadStore((state) => state.running);
  const expanded = useDownloadStore((state) => state.expanded);

  const playlists = usePlaylistStore(useShallow((state) => Object.values(state.playlists).flatMap((it) => it)))
  const refreshAllPlaylists = usePlaylistStore((state) => state.init)
  const deletePlaylist = usePlaylistStore((state) => state.delete)

  useEffect(() =>  { refreshAllPlaylists() }, [])

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
    }, 100);
    return () => {
      clearInterval(interval);
    };
  }, [running]);

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
              !expanded ? "max-h-[calc(100vh-30px)]" : "max-h-[calc(100vh)]"
            )}
          >
            <ScrollArea className={`h-full scroll-mt-`}>
              <Outlet />
            </ScrollArea>
          </div>
        </div>
      </div>
    </ThemeProvider>
  );
}

function DownloadOverlay() {
  const downloads = useDownloadStore<Download[]>(
    useShallow((state) => Object.values(state.downloads))
  );
  const toggleExpanded = useDownloadStore((state) => state.toggleExpanded);
  const expanded = useDownloadStore((state) => state.expanded);

  if (expanded && downloads.length > 0) {
    return (
      <Card className="bg-primary/20 backdrop-blur-md flex flex-col absolute top-2 w-2/3 max-h-60 min-h-40 z-40 start-1/2 -translate-x-1/2 overflow-y-hidden overflow-x-hidden">
        <ChevronUpIcon
          className="w-full m-2"
          onPointerDown={() => toggleExpanded()}
        />
        <ScrollArea className="h-60 w-full">
          {downloads.map((download) => (
            <DownloadItem download={download} />
          ))}
        </ScrollArea>
      </Card>
    );
  }

  if (!expanded && downloads.length > 0) {
    return (
      <div
        className="h-[30px] w-full bg-primary"
        onPointerDown={() => toggleExpanded()}
      >
        {`Downloading ${downloads.length}`}
      </div>
    );
  }

  return <></>;
}

function DownloadItem({ download }: { download: Download }) {
  const onClear = useDownloadStore((state) => state.remove);
  const retry = useDownloadStore((state) => state.retry);

  if (download.state === "finished") {
    return (
      <div className="flex flex-row items-center justify-between pb-2">
        <div className="flex flex-col space-y-1 px-4">
          <b>{download.filename}</b>
          <div className="text-sm">{`Downloaded ${formatBytes(
            download.fetch.total
          )}`}</div>
          <div className="text-sm">{`Unzipped ${formatBytes(
            download.unzip.total
          )}`}</div>
        </div>
        <Button
          size="icon"
          className="me-12"
          onClick={() => onClear(download.link)}
        >
          <CheckCircle2Icon></CheckCircle2Icon>
        </Button>
      </div>
    );
  }

  if (download.state === "error") {
    return (
      <div className="flex flex-row items-center justify-between pb-2">
        <div className="flex flex-col space-y-1 px-4">
          <b>{download.filename}</b>
          <div className="text-sm">{`An error occured while trying to download ${download.filename}`}</div>
        </div>
        <Button
          size="icon"
          className="me-12"
          onClick={() => retry(download.link)}
        >
          <RefreshCwIcon />
        </Button>
        <Button
          size="icon"
          className="me-12"
          onClick={() => onClear(download.link)}
        >
          <XIcon />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-1 p-4">
      <b>{`${download.filename} ${
        download.state === "queued" ? "queued" : ""
      }`}</b>
      <ProgressBar progress={download.fetch} title="Downloading" />
      <ProgressBar progress={download.unzip} title="Unzipping" />
    </div>
  );
}

function ProgressBar({
  title,
  progress,
}: {
  title: string;
  progress: DownloadProgress;
}) {
  return (
    <div className="flex flex-row items-center justify-start space-x-2">
      <Progress
        value={
          progress.total !== 0 ? (progress.progress / progress.total) * 100 : 0
        }
        className="w-[75%] h-6"
      />
      <div className="flex flex-col">
        <div>{title}</div>
        <div className="text-sm">{`${formatBytes(
          progress.progress
        )} / ${formatBytes(progress.total)}`}</div>
      </div>
    </div>
  );
}

export default App;
