import { cn } from "@/libs/cn";
import {
  checkDownloadComplete,
  checkDownloadError,
  Download,
  DownloadProgress,
  DownloadSortPriority,
  DownloadState,
  useDownloadStore,
} from "@/stores/useDownloadStore";
import {
  CheckCircle2Icon,
  ChevronUpIcon,
  RefreshCwIcon,
  XIcon,
} from "lucide-solid";
import { createMemo, For } from "solid-js";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { formatBytes } from "@/libs/tsutils";
import { Progress } from "../ui/progress";

export function DownloadOverlay() {
  const store = useDownloadStore();

  const sortedDownloads = createMemo(() =>
    Object.values(store.downloads).sort(
      (a, b) => DownloadSortPriority[a.state] - DownloadSortPriority[b.state]
    )
  );

  const counts = createMemo(() => {
    return {
      errors: sortedDownloads().filter((d) => checkDownloadError(d)).length,
      successful: sortedDownloads().filter((d) => checkDownloadComplete(d))
        .length,
      running: sortedDownloads().filter((d) => !checkDownloadComplete(d))
        .length,
    };
  });

  return (
    <>
      <Card
        class={cn(
          "bg-primary/20 backdrop-brightness-50 backdrop-blur-md flex flex-col fixed top-2 w-2/3 min-h-40 z-40 start-1/2 -translate-x-1/2 overflow-y-hidden overflow-x-hidden",
          store.expanded && sortedDownloads().length > 0
            ? "animate-in slide-in-from-top fade-in visible"
            : "animate-out slide-out-to-top fade-out hidden"
        )}
      >
        <div class="flex flex-row">
          <div class="flex flex-row w-full justify-between">
            <ChevronUpIcon
              class="w-full m-2"
              onPointerDown={store.events.toggleExpanded}
            />
            <div class="flex flex-row space-x-2 mx-2">
              <Button onClick={() => {}}>Clear Done</Button>
              <Button onClick={store.events.retryAll}>Retry All Errored</Button>
            </div>
          </div>
        </div>
        <div class="max-h-96 w-full overflow-y-scroll flex flex-col">
          <For each={sortedDownloads()}>
            {(download) => (
              <DownloadItem download={download} events={store.events} />
            )}
          </For>
        </div>
      </Card>

      <div
        class={cn(
          "h-[30px] w-full bg-primary",
          !store.expanded && sortedDownloads().length > 0
            ? "animate-in fade-in opacity-100"
            : "animate-out fade-out opacity-0 h-0"
        )}
        onPointerDown={store.events.toggleExpanded}
      >
        <div class="flex flex-col items-start justify-center h-full px-2">
          <div class="text-primary-foreground font-semibold flex flex-row space-x-4">
            <span>{`Downloading: ${counts().running}`}</span>
            <span>{`Finsished: ${counts().successful}`}</span>
            <span>{`Errors: ${counts().errors}`}</span>
          </div>
        </div>
      </div>
    </>
  );
}

function DownloadItem({
  download,
  events,
}: {
  download: Download;
  events: DownloadState["events"];
}) {
  if (download.state === "finished") {
    return (
      <div class="flex flex-row items-center justify-between pb-2">
        <div class="flex flex-col space-y-1 px-4">
          <b>{download.filename}</b>
          <div class="text-sm">{`Downloaded ${formatBytes(
            download.fetch.total
          )}`}</div>
          <div class="text-sm">{`Unzipped ${formatBytes(
            download.unzip.total
          )}`}</div>
        </div>
        <Button
          size="icon"
          class="me-12"
          onClick={() => events.clear(download.link)}
        >
          <CheckCircle2Icon></CheckCircle2Icon>
        </Button>
      </div>
    );
  } else if (download.state === "error") {
    return (
      <div class="flex flex-row items-center justify-between pb-2">
        <div class="flex flex-col space-y-1 px-4">
          <b>{download.filename}</b>
          <div class="text-sm">{`An error occured while trying to download ${download.filename}`}</div>
        </div>
        <div class="flex flex-row items-center">
          <Button
            size="icon"
            class="me-12"
            onClick={() => events.retry(download.link)}
          >
            <RefreshCwIcon />
          </Button>
          <Button
            size="icon"
            class="me-12"
            onClick={() => events.clear(download.link)}
          >
            <XIcon />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div class="flex flex-col space-y-1 p-4">
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
    <div class="flex flex-row items-center justify-start space-x-2">
      <Progress
        value={
          progress.total !== 0 ? (progress.progress / progress.total) * 100 : 0
        }
        class="w-[75%] h-6"
      />
      <div class="flex flex-col">
        <div>{title}</div>
        <div class="text-sm">{`${progress.progress} / ${progress.total}`}</div>
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
    <div class="flex flex-row items-center justify-start space-x-2">
      <Progress
        value={
          progress.total !== 0 ? (progress.progress / progress.total) * 100 : 0
        }
        class="w-[75%] h-6"
      />
      <div class="flex flex-col">
        <div>{title}</div>
        <div class="text-sm">{`${formatBytes(
          progress.progress
        )} / ${formatBytes(progress.total)}`}</div>
      </div>
    </div>
  );
}
