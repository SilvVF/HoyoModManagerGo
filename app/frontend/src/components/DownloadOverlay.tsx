import { formatBytes } from "@/lib/tsutils";
import { useDownloadStore, Download, DownloadProgress, dlStates, dlSortPriority } from "@/state/downloadStore";
import { ChevronUpIcon, CheckCircle2Icon, RefreshCwIcon, XIcon } from "lucide-react";
import { useShallow } from "zustand/shallow";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Progress } from "./ui/progress";
import { cn } from "@/lib/utils";

export function DownloadOverlay() {
  const onClear = useDownloadStore((state) => state.remove);
  const retry = useDownloadStore((state) => state.retry);
  const downloads = useDownloadStore<Download[]>(
    useShallow((state) => Object.values(state.downloads).sort((a, b) => dlSortPriority[a.state] - dlSortPriority[b.state]))
  );
  const toggleExpanded = useDownloadStore((state) => state.toggleExpanded);
  const expanded = useDownloadStore((state) => state.expanded);

  return (
    <>
      <Card className={
        cn("bg-primary/20 backdrop-brightness-50 backdrop-blur-md flex flex-col fixed top-2 w-2/3 min-h-40 z-40 start-1/2 -translate-x-1/2 overflow-y-hidden overflow-x-hidden",
          expanded && downloads.length > 0 ? "animate-in slide-in-from-top fade-in visible"
            : "animate-out slide-out-to-top fade-out hidden"
        )

      }>
        <div className="flex flex-row">
          <div className="flex flex-row w-full justify-between">
            <ChevronUpIcon
              className="w-full m-2"
              onPointerDown={toggleExpanded}
            />
            <div className="flex flex-row space-x-2 mx-2">
              <Button onClick={() => {
                for (const done of downloads.filter((d) => d.state === "finished" || d.state === "error")) {
                  onClear(done.link)
                }
              }}>
                Clear Done
              </Button>
              <Button onClick={() => {
                for (const errored of downloads.filter((d) => d.state === "error")) {
                  retry(errored.link)
                }
              }}>
                Retry All Errored
              </Button>
            </div>
          </div>
        </div>
        <div className="max-h-96 w-full overflow-y-scroll flex flex-col">
          {downloads.map((download) => (
            <DownloadItem download={download} />
          ))}
        </div>
      </Card>

      <div
        className={
          cn("h-[30px] w-full bg-primary",
            !expanded && downloads.length > 0 ? "animate-in fade-in opacity-100"
              : "animate-out fade-out opacity-0 h-0"
          )
        }
        onPointerDown={toggleExpanded}
      >
        <div className="flex flex-col items-start justify-center h-full px-2">
          <div className="text-primary-foreground font-semibold flex flex-row space-x-4">
            <span>{`Downloading: ${downloads.filter(d => dlStates.includes(d.state)).length}`}</span>
            <span>{`Finsished: ${downloads.filter(d => d.state === "finished").length}`}</span>
            <span>{`Errors: ${downloads.filter(d => d.state === "error").length}`}</span>
          </div>
        </div>
      </div>
    </>
  )
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
  } else if (download.state === "error") {
    return (
      <div className="flex flex-row items-center justify-between pb-2">
        <div className="flex flex-col space-y-1 px-4">
          <b>{download.filename}</b>
          <div className="text-sm">{`An error occured while trying to download ${download.filename}`}</div>
        </div>
        <div className="flex flex-row items-center">
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
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-1 p-4">
      <b>{`${download.filename} ${download.state}`}</b>
      {download.state === "compress" ? (
        <CompressProgressBar title="Compressing" progress={download.compress} />
      ) : (
        <>
          <ProgressBar progress={download.fetch} title="Downloading" />
          <ProgressBar progress={download.unzip} title="Unzipping" />
        </>
      )}
    </div>
  );
}

function CompressProgressBar({
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
        <div className="text-sm">{`${progress.progress} / ${progress.total}`}</div>
      </div>
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
