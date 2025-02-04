import { formatBytes } from "@/lib/tsutils";
import { useDownloadStore, Download, DownloadProgress } from "@/state/downloadStore";
import { ChevronUpIcon, CheckCircle2Icon, RefreshCwIcon, XIcon } from "lucide-react";
import { useShallow } from "zustand/shallow";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { ScrollArea } from "./ui/scroll-area";
import { Progress } from "./ui/progress";

export function DownloadOverlay() {
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
