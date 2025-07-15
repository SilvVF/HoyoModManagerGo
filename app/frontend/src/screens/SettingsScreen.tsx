import { Button } from "@/components/ui/button";
import {
  discoverGamePref,
  ignorePref,
  maxDownloadWorkersPref,
  serverPortPref,
  spaceSaverPref,
  serverUsernamePref,
  serverPasswordPref,
  serverAuthTypePref,
  cleanModDirPref,
  usePrefQuery,
} from "@/data/prefs";
import {
  GetExportDirectory,
  GetExclusionPaths,
  FixZipCompression,
  CompressionRunning,
  CancelZipCompression,
} from "../../wailsjs/go/main/App";
import { Card } from "@/components/ui/card";
import { range } from "@/lib/tsutils";
import { Slider } from "@/components/ui/slider";
import { ReactNode, useEffect, useState } from "react";
import {
  DownloadIcon,
  Edit,
  GlobeIcon,
  HammerIcon,
  LucideIcon,
  PlayIcon,
  RefreshCwIcon,
  SparkleIcon,
  StopCircleIcon,
  TrainIcon,
  UndoIcon,
  WavesIcon,
} from "lucide-react";
import { ModSizeChart } from "@/components/mod-size-chart";
import { NameDialog } from "@/components/NameDialog";
import { useServerStore } from "@/state/serverStore";
import { useShallow } from "zustand/shallow";
import { EventsOn, LogDebug } from "wailsjs/runtime/runtime";
import { ScrollArea } from "@radix-ui/react-scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChartItem, useStatsState } from "@/state/useStatsState";
import { LPlugin, usePluginStore } from "@/state/pluginStore";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { types } from "wailsjs/go/models";
import { useUpdatesStore } from "@/state/updateStore";
import { SectionList } from "@/components/SectionList";
import { useStateProducer } from "@/lib/utils";
import { useViewTransitionsStore } from "@/hooks/useCrossfadeNavigate";
import { useOnekoStore } from "@/components/oneko";
import { DirectorySettings } from "@/components/hmm/settings/DirectorySettings";

type SettingsDialog =
  | "edit_port"
  | "edit_password"
  | "edit_username"
  | "check_updates"
  | "migrate_mods_dir";

const AuthType: { [keyof: number]: string } = {
  0: "None",
  1: "Basic",
} as const;

export default function SettingsScreen() {
  const [{ data: discover }, setDiscover] = usePrefQuery(discoverGamePref);
  const [{ data: ignore }, setIgnore] = usePrefQuery(ignorePref);
  const [{ data: serverPort }, setServerPort] = usePrefQuery(serverPortPref);
  const [{ data: spaceSaver }, setSpaceSaver] = usePrefQuery(spaceSaverPref);
  const [{ data: username }, setUsername] = usePrefQuery(serverUsernamePref);
  const [{ data: password }, setPassword] = usePrefQuery(serverPasswordPref);
  const [{ data: authType }, setAuthType] = usePrefQuery(serverAuthTypePref);

  const { viewTransitions, setViewTransitions } = useViewTransitionsStore(
    useShallow((state) => {
      return {
        viewTransitions: state.useTransitions,
        setViewTransitions: state.setTransition,
      };
    }),
  );
  const { oneko, setOneko } = useOnekoStore(
    useShallow((state) => {
      return {
        oneko: state.alive,
        setOneko: state.setOneko,
      };
    }),
  );
  const [{ data: maxDownloadWorkers }, setMaxDownloadWorkers] = usePrefQuery(
    maxDownloadWorkersPref,
  );
  const [{ data: cleanModDir }, setCleanModDir] = usePrefQuery(cleanModDirPref);

  const [dialog, setDialog] = useState<SettingsDialog | undefined>(undefined);
  const [sliderValue, setSliderValue] = useState(maxDownloadWorkers ?? 1);
  const ipAddr = useServerStore(useShallow((state) => state.addr));
  const enabledPlugins = usePluginStore(
    useShallow((state) => state.enabledFiles),
  );
  const plugins = usePluginStore(useShallow((state) => state.plugins));
  const enablePlugin = usePluginStore((state) => state.enablePlugin);
  const disablePlugin = usePluginStore((state) => state.disablePlugin);

  const stats = useStatsState();

  const setExclusionPaths = async () => {
    GetExclusionPaths().then((paths) => {
      if (paths) {
        setIgnore((prev) => [...(prev ?? []), ...paths]);
      }
    });
  };

  const setExclusionDir = async () => {
    GetExportDirectory().then((path) => {
      if (path) {
        setIgnore((prev) => [...(prev ?? []), path]);
      }
    });
  };

  const removeFromExclusions = (path: string) => {
    setIgnore((prev) => prev?.filter((it) => it !== path));
  };

  useEffect(
    () => setSliderValue(maxDownloadWorkers ?? 1),
    [maxDownloadWorkers],
  );

  const dialogSettings: {
    [key: string]: {
      title: string;
      description: string;
      onSuccess: (value: string) => void;
    };
  } = {
    edit_port: {
      title: "Edit port number",
      description:
        "change the port number the http server for external apps will run on (1024 - 49151)",
      onSuccess: (port: string) => {
        try {
          const pNum = Math.min(Math.max(1024, Number(port.trim())), 49151);
          LogDebug(`setting port to ${pNum}`);
          setServerPort(() => pNum);
        } catch {}
      },
    },
    edit_username: {
      title: "Edit username",
      description:
        "change the username that will be expected when calling any Http endpoints",
      onSuccess: (username: string) => {
        try {
          setUsername(() => username);
        } catch {}
      },
    },
    edit_password: {
      title: "Edit password",
      description:
        "change the password that will be expected when calling any Http endpoints",
      onSuccess: (password: string) => {
        try {
          setPassword(() => password);
        } catch {}
      },
    },
  };

  const dialogSetting =
    dialog !== undefined &&
    Object.keys(dialogSettings).find((k) => k === dialog)
      ? dialogSettings[dialog]
      : undefined;

  return (
    <div className="flex h-full w-full flex-col px-4">
      <NameDialog
        title={dialogSetting?.title ?? ""}
        description={dialogSetting?.description ?? ""}
        open={dialog !== undefined}
        onOpenChange={() => setDialog(undefined)}
        onSuccess={(n) => dialogSetting?.onSuccess(n)}
      />
      <UpdatesDialog
        open={dialog === "check_updates"}
        onOpenChange={(open) =>
          open ? setDialog("check_updates") : setDialog(undefined)
        }
      />
      <h1 className="my-4 text-2xl font-bold">Settings</h1>
      <ScrollArea className="max-w-600">
        <div className="flex flex-row space-x-2 overflow-x-scroll">
          {stats.data?.map((data) => {
            return <SizeChart key={data.game} item={data} />;
          }) ??
            range(1, 4).map(() => {
              return <Skeleton className="aspect-square min-w-[400px]" />;
            })}
        </div>
      </ScrollArea>
      <h2 className="mt-8 text-lg font-semibold tracking-tight">
        Export Locations
      </h2>
      <DirectorySettings />
      <h2 className="text-lg font-semibold tracking-tight">Mod Fix Updates</h2>
      <div className="m-2 flex items-center justify-between rounded-lg p-2 hover:bg-primary-foreground">
        <text className="text-zinc-500">
          check game bannana for mod fix executables
        </text>
        <Button onPointerDown={() => setDialog("check_updates")}>
          check for updates
        </Button>
      </div>
      <ExclusionDirSettingsItem
        setExclusionDir={setExclusionDir}
        setExclusionPaths={setExclusionPaths}
        ignore={ignore}
        removeFromExclusions={removeFromExclusions}
      />
      <PluginSettingsItem
        className="mt-4"
        enablePlugin={enablePlugin}
        disablePlugin={disablePlugin}
        available={plugins}
        enabled={enabledPlugins}
      />
      <h2 className="mt-4 text-lg font-semibold tracking-tight">
        Max download workers
      </h2>
      <div className="flex flex-row justify-between rounded-lg p-4 px-4 hover:bg-primary-foreground">
        {maxDownloadWorkers ? (
          <Slider
            className="w-3/4"
            defaultValue={[maxDownloadWorkers]}
            max={10}
            min={1}
            step={1}
            onValueChange={(value) => setSliderValue(value[0])}
            onValueCommit={(value) => setMaxDownloadWorkers(() => value[0])}
          />
        ) : undefined}
        <div className="mx-4 text-lg font-semibold tracking-tight">{`Max workers: ${sliderValue} `}</div>
      </div>
      <div className="space-y-4">
        <SettingsCheckBoxItem
          title="Enable space saver"
          description="when enabled stores all mods in .zip files (defeault enabled)"
          checked={spaceSaver ?? false}
          onCheckedChange={() => setSpaceSaver((prev) => !prev)}
        />
        <SettingsCheckBoxItem
          title="Clean mod export directory when generating"
          description="when enabled this will delete files not generated by this program located in selected mod dir"
          checked={cleanModDir ?? false}
          onCheckedChange={() => setCleanModDir((prev) => !prev)}
        />
      </div>
      <h2 className="mt-4 text-lg font-semibold tracking-tight">Http server</h2>
      <div className="flex flex-row justify-between px-4">
        <div className="flex flex-col">
          <div className="m-1 text-zinc-500">{`to connect go to http://${ipAddr}:${serverPort}`}</div>
          <div className="m-1 text-zinc-500">{`Port: ${serverPort}`}</div>
        </div>
        <div className="flex flex-row space-x-6">
          <Button size={"icon"} onPointerDown={() => setDialog("edit_port")}>
            <Edit />
          </Button>
          <ServerActions />
        </div>
      </div>
      <SettingsDropDownItem
        items={Object.keys(AuthType)}
        selectedLabel={
          <text>{authType !== undefined ? AuthType[authType] : undefined}</text>
        }
        title="Server Auth Type"
        description="change the auth middleware used when running the server for android app"
        onChange={(item) => setAuthType(() => Number(item))}
        itemContent={(item) => <text>{AuthType[Number(item)]}</text>}
      />
      <SettingsEditItem
        title="Server Username"
        description={`Username: ${username}`}
        content={
          <Button
            size={"icon"}
            onPointerDown={() => setDialog("edit_username")}
          >
            <Edit />
          </Button>
        }
      />
      <SettingsEditItem
        title=" Server Password"
        description={`Password: ${password}`}
        content={
          <Button
            size={"icon"}
            onPointerDown={() => setDialog("edit_password")}
          >
            <Edit />
          </Button>
        }
      />
      <SettingsEditItem
        title="Saved discover path"
        description={`Path: ${discover}`}
        content={
          <Button
            size={"icon"}
            onPointerDown={() => setDiscover(() => undefined)}
          >
            <UndoIcon />
          </Button>
        }
      />
      <SettingsCheckBoxItem
        title="use view transitions"
        description="animate transition between different pages"
        checked={viewTransitions ?? false}
        onCheckedChange={setViewTransitions}
      />
      <SettingsCheckBoxItem
        title="oneko"
        description="have a cat follow the mouse cursor"
        checked={oneko}
        onCheckedChange={setOneko}
      />
      <FixCompressionButton />
    </div>
  );
}

function FixCompressionButton() {
  const [cancelling, setCancelling] = useState(false);
  const { running, progress } = useStateProducer<{
    running: boolean;
    progress: { total: number; progress: number };
  }>(
    { running: false, progress: { total: 0, progress: 0 } },
    async (update, onDispose) => {
      const updateState = async () => {
        const { running, prog } = await CompressionRunning();
        const v = {
          running: running,
          progress: {
            total: prog.total,
            progress: prog.progress,
          },
        };
        LogDebug(`update compress state ${v}`);
        update(v);
      };

      const cancel = EventsOn("compresssion_event", (e) => {
        LogDebug(`received compression event ${e}`);
        updateState();
      });

      onDispose(() => {
        LogDebug("disposing listener");
        cancel();
      });
    },
  );

  const cancelJob = () => {
    if (cancelling) return;
    setCancelling(true);
    CancelZipCompression().finally(() => setCancelling(false));
  };

  return (
    <SettingsEditItem
      title="Fix zip compression"
      description={
        running
          ? `fixing zip compression Progress: ${progress.progress} / ${progress.total}${cancelling ? " cancelling..." : ""}`
          : `compresses zips further using better compression method`
      }
      content={
        <>
          {running ? (
            <Button size={"icon"} onPointerDown={() => cancelJob()}>
              <StopCircleIcon />
            </Button>
          ) : (
            <Button size={"icon"} onPointerDown={() => FixZipCompression()}>
              <HammerIcon />
            </Button>
          )}
        </>
      }
    />
  );
}

function SettingsDropDownItem<T>({
  title,
  description,
  selectedLabel,
  items,
  itemContent,
  onChange,
}: {
  title: string;
  description?: string;
  selectedLabel?: ReactNode;
  items: T[] | undefined;
  itemContent: (v: T) => ReactNode;
  onChange: (v: T) => void;
}) {
  return (
    <SettingsEditItem
      title={title}
      description={description}
      content={
        <div className="flex flex-row items-center space-x-4">
          {selectedLabel}
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-1">
              <Button size={"icon"}>
                <Edit />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {items?.map((item) => {
                return (
                  <DropdownMenuItem onClick={() => onChange(item)}>
                    {itemContent(item)}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      }
    ></SettingsEditItem>
  );
}

function SettingsEditItem({
  title,
  description,
  content,
}: {
  title: string;
  description?: string;
  content: ReactNode;
}) {
  return (
    <div className="m-2 flex flex-row items-center justify-between rounded-lg p-2 hover:bg-primary-foreground">
      <div className="flex flex-col space-y-2">
        <text className="text-xl leading-none font-medium">{title}</text>
        <text className="text-md leading-none font-medium text-gray-500">
          {description}
        </text>
      </div>
      {content}
    </div>
  );
}

function SettingsCheckBoxItem({
  title,
  description,
  checked,
  onCheckedChange,
}: {
  title: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <SettingsEditItem
      title={title}
      description={description}
      content={
        <Checkbox
          className="h-10 w-10"
          checked={checked}
          onCheckedChange={(v) => onCheckedChange(v as boolean)}
        />
      }
    ></SettingsEditItem>
  );
}

function ServerActions() {
  const serverRunning = useServerStore(useShallow((state) => state.running));

  const startServer = useServerStore((state) => state.start);
  const restartServer = useServerStore((state) => state.restart);
  const stopServer = useServerStore((state) => state.shutdown);

  if (serverRunning) {
    return (
      <div className="flex flex-row space-x-6">
        <Button size={"icon"} onClick={restartServer}>
          <RefreshCwIcon />
        </Button>
        <Button size={"icon"} onClick={stopServer}>
          <StopCircleIcon />
        </Button>
      </div>
    );
  }

  return (
    <div>
      <Button size={"icon"} onClick={startServer}>
        <PlayIcon />
      </Button>
    </div>
  );
}

export function SizeChart({ item }: { item: ChartItem }) {
  return (
    <div className="flex aspect-square min-w-[400px] flex-col justify-center rounded-md border-card bg-card">
      <ModSizeChart
        config={item.config}
        title={item.game}
        total={item.total}
        data={item.data}
      />
    </div>
  );
}

interface ExlusionDirProps extends React.HTMLAttributes<HTMLDivElement> {
  ignore: string[] | undefined;
  setExclusionPaths: () => void;
  setExclusionDir: () => void;
  removeFromExclusions: (path: string) => void;
}

function ExclusionDirSettingsItem({
  className,
  ignore,
  setExclusionPaths,
  setExclusionDir,
  removeFromExclusions,
}: ExlusionDirProps) {
  return (
    <SectionList
      className={className}
      title="Generation Exclusions"
      actions={[
        { title: "Add Exclusion Files", onClick: setExclusionPaths },
        { title: "Add Exclusion Directory", onClick: setExclusionDir },
      ]}
      createKey={(item) => item}
      items={ignore ?? []}
      itemContent={(path) => (
        <div
          key={path}
          className="flex w-full flex-row items-center justify-between rounded-lg p-2 hover:bg-primary-foreground"
        >
          <div className="m-2 text-zinc-500">{path}</div>
          <Button
            size="icon"
            className="mx-2"
            onPointerDown={() => removeFromExclusions(path)}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              height="24px"
              viewBox="0 -960 960 960"
              width="24px"
            >
              <path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z" />
            </svg>
          </Button>
        </div>
      )}
    />
  );
}

interface PluginSettingsProps extends React.HTMLAttributes<HTMLDivElement> {
  enabled: string[];
  available: LPlugin[];
  enablePlugin: (path: string) => void;
  disablePlugin: (path: string) => void;
}

function PluginSettingsItem({
  className,
  enabled,
  available,
  enablePlugin,
  disablePlugin,
}: PluginSettingsProps) {
  return (
    <SectionList
      className={className}
      title="Available Plugins"
      items={available}
      createKey={(plugin) => plugin.path}
      itemContent={(plugin) => (
        <div
          key={plugin.path}
          className="flex w-full flex-row items-center justify-between rounded-lg p-2 hover:bg-primary-foreground"
        >
          <div className="flex flex-col">
            <text className="m-2 text-zinc-500">{plugin.path}</text>
            <text className="m-2 text-zinc-500">
              {"LastEvent: " + plugin.lastEvent}
            </text>
            <text className="m-2 text-zinc-500">
              {"Flags: " + plugin.flags}
            </text>
          </div>
          <Checkbox
            checked={enabled.includes(plugin.path)}
            onCheckedChange={(v) => {
              if (v) {
                enablePlugin(plugin.path);
              } else {
                disablePlugin(plugin.path);
              }
            }}
          />
        </div>
      )}
    />
  );
}

const games: {
  [key: number]: {
    game: string;
    icon: LucideIcon;
  };
} = {
  1: { game: "Genshin Impact", icon: SparkleIcon },
  2: { game: "Honkai Star Rail", icon: TrainIcon },
  3: { game: "Zenless Zone Zero", icon: GlobeIcon },
  4: { game: "Wuthering Waves", icon: WavesIcon },
};

function UpdatesDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { loading, value, error } = useUpdatesStore(
    useShallow((state) => {
      return {
        loading: state.loading,
        value: state.value,
        error: state.error,
      };
    }),
  );
  const start = useUpdatesStore((state) => state.start);
  useEffect(() => {
    start();
  }, []);

  const downloadItem = useUpdatesStore((state) => state.downloadItem);
  const inProgress = useUpdatesStore(useShallow((state) => state.inProgress));
  const refresh = useUpdatesStore(useShallow((state) => state.refresh));

  const updateAll = (updates: types.Update[]) => {
    for (const update of updates) {
      downloadItem(update);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="min-h-[80%] max-w-[60%]">
        <div className="flex flex-row justify-between">
          <DialogHeader>
            <DialogTitle>
              <text>Mod fix updates</text>
            </DialogTitle>
            <DialogDescription>
              Select updates for mod fix executables
            </DialogDescription>
          </DialogHeader>
          {loading ? (
            <div className="mx-2 flex flex-row items-center justify-end gap-2 rounded-full text-sm text-muted-foreground">
              <svg
                className="h-4 w-4 animate-spin"
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
              Refreshing...
            </div>
          ) : undefined}
        </div>

        {error && value.isEmpty() ? (
          <div className="t-0 relative mx-2 flex flex-row items-center justify-end gap-2 p-2 text-4xl text-muted-foreground">
            <text>Failed to load updates</text>
          </div>
        ) : undefined}

        {loading && value.isEmpty() ? (
          <div className="t-0 relative mx-2 flex flex-row items-center justify-end gap-2 p-2 text-4xl text-muted-foreground">
            <Skeleton className="h-96 w-[100%]" />
          </div>
        ) : undefined}

        <div className="flex flex-col items-center justify-center">
          {value.isEmpty() ? undefined : (
            <Card className="min-h-[60vh] min-w-[100%]">
              <div className="space-y-1 overflow-y-auto p-2">
                <ScrollArea>
                  {value.map((v) => {
                    return (
                      <div
                        key={v.game}
                        className="flex flex-row items-center justify-between rounded-lg p-2 hover:bg-primary-foreground"
                      >
                        <div className="flex flex-col">
                          <text className="m-2">{games[v.game]["game"]}</text>
                          <text className="m-2 text-zinc-500">{`Current: ${v.current}`}</text>
                          <text className="m-2 text-zinc-500">{`Newest: ${v.newest.name}`}</text>
                        </div>
                        {inProgress.includes(v.newest.dl) ? (
                          <div className="mx-2 flex flex-row items-center justify-end gap-2 rounded-full bg-primary/30 p-2 text-sm text-muted-foreground backdrop-blur-md">
                            <svg
                              className="h-4 w-4 animate-spin"
                              xmlns="http://www.w3.org/2000/svg"
                              width="24"
                              height="24"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                            </svg>
                            Downloading...
                          </div>
                        ) : (
                          <Button onClick={() => downloadItem(v)}>
                            <DownloadIcon />
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </ScrollArea>
              </div>
            </Card>
          )}
        </div>
        <DialogFooter className="sm:justify-start">
          <DialogClose asChild>
            <Button type="button" variant="destructive">
              Cancel
            </Button>
          </DialogClose>
          <Button
            type="button"
            variant="default"
            onClick={() => updateAll(value)}
          >
            Update All
          </Button>
          <Button type="button" variant="secondary" onClick={refresh}>
            Refresh
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
