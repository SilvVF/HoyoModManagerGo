import { Button } from "@/components/ui/button";
import {
  discoverGamePref,
  genshinDirPref,
  honkaiDirPref,
  ignorePref,
  maxDownloadWorkersPref,
  usePrefrenceAsState,
  wuwaDirPref,
  zzzDirPref,
  serverPortPref,
  spaceSaverPref,
  serverUsernamePref,
  serverPasswordPref,
  serverAuthTypePref,
  cleanModDirPref,
} from "@/data/prefs";
import {
  GetExportDirectory,
  GetExclusionPaths,
  GetUpdates,
} from "../../wailsjs/go/main/App";
import { Card } from "@/components/ui/card";
import { cn, useStateProducerT } from "@/lib/utils";
import { range } from "@/lib/tsutils";
import { Slider } from "@/components/ui/slider";
import { useEffect, useMemo, useState } from "react";
import {
  DownloadIcon,
  Edit,
  GlobeIcon,
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
import { NameDialog } from "./GameScreen";
import { useServerStore } from "@/state/serverStore";
import { useShallow } from "zustand/shallow";
import { LogDebug } from "wailsjs/runtime/runtime";
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
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { types } from "wailsjs/go/models";
import { Progress } from "@/components/ui/progress";

type SettingsDialog = "edit_port" | "edit_password" | "edit_username" | "check_updates";
const AuthType: { [keyof: number]: string } = {
  0: "None",
  1: "Basic",
} as const;

export default function SettingsScreen() {
  const [honkaiDir, setHonkaiDir] = usePrefrenceAsState(honkaiDirPref);
  const [genshinDir, setGenshinDir] = usePrefrenceAsState(genshinDirPref);
  const [discover, setDiscover] = usePrefrenceAsState(discoverGamePref);
  const [wuwaDir, setWuwaDir] = usePrefrenceAsState(wuwaDirPref);
  const [zzzDir, setZZZdir] = usePrefrenceAsState(zzzDirPref);
  const [ignore, setIgnore] = usePrefrenceAsState(ignorePref);
  const [serverPort, setServerPort] = usePrefrenceAsState(serverPortPref);
  const [spaceSaver, setSpaceSaver] = usePrefrenceAsState(spaceSaverPref);
  const [username, setUsername] = usePrefrenceAsState(serverUsernamePref);
  const [password, setPassword] = usePrefrenceAsState(serverPasswordPref);
  const [authType, setAuthType] = usePrefrenceAsState(serverAuthTypePref);
  const [maxDownloadWorkers, setMaxDownloadWorkers] = usePrefrenceAsState(
    maxDownloadWorkersPref
  );
  const [cleanModDir, setCleanModDir] = usePrefrenceAsState(cleanModDirPref);

  const [dialog, setDialog] = useState<SettingsDialog | undefined>(undefined);
  const [sliderValue, setSliderValue] = useState(maxDownloadWorkers ?? 1);
  const ipAddr = useServerStore(useShallow((state) => state.addr));
  const enabledPlugins = usePluginStore(
    useShallow((state) => state.enabledFiles)
  );
  const plugins = usePluginStore(useShallow((state) => state.plugins));
  const initPlugins = usePluginStore((state) => state.init);
  const enablePlugin = usePluginStore((state) => state.enablePlugin);
  const disablePlugin = usePluginStore((state) => state.disablePlugin);


  const stats = useStatsState(undefined);

  const items = useMemo(
    () => [
      {
        name: "Honkai Star Rail",
        value: honkaiDir,
        setValue: setHonkaiDir,
      },
      {
        name: "Genshin Impact",
        value: genshinDir,
        setValue: setGenshinDir,
      },
      {
        name: "Wuthering Waves",
        value: wuwaDir,
        setValue: setWuwaDir,
      },
      {
        name: "Zenless Zone Zero",
        value: zzzDir,
        setValue: setZZZdir,
      },
    ],
    [honkaiDir, zzzDir, genshinDir, setHonkaiDir, setZZZdir, setGenshinDir]
  );

  const openDialogAndSet = async (setDir: (s: string) => void) => {
    GetExportDirectory().then((dir) => {
      if (dir) {
        setDir(dir);
      }
    });
  };

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
    [maxDownloadWorkers]
  );

  useEffect(() => {
    initPlugins();
  }, []);

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
          setServerPort(pNum);
        } catch { }
      },
    },
    edit_username: {
      title: "Edit username",
      description:
        "change the username that will be expected when calling any Http endpoints",
      onSuccess: (username: string) => {
        try {
          setUsername(username);
        } catch { }
      },
    },
    edit_password: {
      title: "Edit password",
      description:
        "change the password that will be expected when calling any Http endpoints",
      onSuccess: (password: string) => {
        try {
          setPassword(password);
        } catch { }
      },
    },
  };

  const dialogSetting =
    (dialog !== undefined && dialog !== "check_updates") ? dialogSettings[dialog] : undefined;

  return (
    <div className="flex flex-col w-full h-full px-4">
      <NameDialog
        title={dialogSetting?.title ?? ""}
        description={dialogSetting?.description ?? ""}
        open={dialog !== undefined}
        onOpenChange={() => setDialog(undefined)}
        onSuccess={(n) => dialogSetting?.onSuccess(n)}
      />
      <UpdatesDialog
        open={dialog === "check_updates"}
        onOpenChange={(open) => open ? setDialog("check_updates") : setDialog(undefined)}
      />
      <h1 className="text-2xl font-bold my-4 ">Settings</h1>
      <ScrollArea className="max-w-[600]">
        <div className="flex flex-row overflow-x-scroll space-x-2">
          {stats?.map((data) => {
            return <SizeChart item={data} />;
          }) ??
            range(1, 4).map(() => {
              return <Skeleton className="min-w-[400px] aspect-square" />;
            })}
        </div>
      </ScrollArea>
      <h2 className="text-lg font-semibold tracking-tight">Export Locations</h2>
      {items.map((item) => {
        return (
          <SettingsDirItem
            name={item.name}
            setDir={() => openDialogAndSet(item.setValue)}
            dir={item.value}
          />
        );
      })}
      <h2 className="text-lg font-semibold tracking-tight">
        Generation Exclusions
      </h2>
      <ExclusionDirSettingsItem
        setExclusionDir={setExclusionDir}
        setExclusionPaths={setExclusionPaths}
        ignore={ignore}
        removeFromExclusions={removeFromExclusions}
      />
      <h2 className="text-lg font-semibold tracking-tight  mt-4">Available Plugins</h2>
      <PluginSettingsItem
        className="mt-4"
        enablePlugin={enablePlugin}
        disablePlugin={disablePlugin}
        available={plugins}
        enabled={enabledPlugins}
      />
      <Button onClick={() => setDialog("check_updates")}>Check updates</Button>
      <h2 className="text-lg font-semibold tracking-tight mt-4">
        Max download workers
      </h2>
      <div className="px-4 flex flex-row justify-between">
        {maxDownloadWorkers ? (
          <Slider
            className="w-3/4"
            defaultValue={[maxDownloadWorkers]}
            max={10}
            min={1}
            step={1}
            onValueChange={(value) => setSliderValue(value[0])}
            onValueCommit={(value) => setMaxDownloadWorkers(value[0])}
          />
        ) : undefined}
        <div className="text-lg font-semibold tracking-tight mx-4">{`Max workers: ${sliderValue} `}</div>
      </div>
      <div className="flex items-center space-x-6 my-6">
        <Checkbox
          checked={spaceSaver ?? false}
          onCheckedChange={(v) => setSpaceSaver(v as boolean)}
        />
        <label
          htmlFor="terms"
          className="text-xl font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          Enable space saver
        </label>
      </div>
      <div className="flex items-center space-x-6 my-6">
        <Checkbox
          checked={cleanModDir ?? false}
          onCheckedChange={(v) => setCleanModDir(v as boolean)}
        />
        <label
          htmlFor="terms"
          className="text-xl font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          Clean mod export directory when generating
        </label>
      </div>
      <h2 className="text-lg font-semibold tracking-tight mt-4">Http server</h2>
      <div className="px-4 flex flex-row justify-between">
        <div className="flex flex-col">
          <div className="text-zinc-500  m-1">{`to connect go to http://${ipAddr}:${serverPort}`}</div>
          <div className="text-zinc-500  m-1">{`Port: ${serverPort}`}</div>
        </div>
        <div className="flex flex-row space-x-6">
          <Button size={"icon"} onPointerDown={() => setDialog("edit_port")}>
            <Edit />
          </Button>
          <ServerActions />
        </div>
      </div>
      <h2 className="text-lg font-semibold tracking-tight mt-2">
        Server auth type
      </h2>
      <div className="flex flex-row w-full justify-between px-4">
        <div className="text-zinc-500  m-2">{`Auth type: ${authType !== undefined ? AuthType[authType] : ""
          }`}</div>
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-1">
            <Button size={"icon"}>
              <Edit />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {Object.keys(AuthType).map((type) => {
              return (
                <DropdownMenuItem onClick={() => setAuthType(Number(type))}>
                  {AuthType[Number(type)]}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <h2 className="text-lg font-semibold tracking-tight mt-2">
        Server username
      </h2>
      <div className="px-4 flex flex-row justify-between">
        <div className="text-zinc-500  m-2">{`Username: ${username}`}</div>
        <Button size={"icon"} onPointerDown={() => setDialog("edit_username")}>
          <Edit />
        </Button>
      </div>
      <h2 className="text-lg font-semibold tracking-tight mt-2">
        Server password
      </h2>
      <div className="px-4 flex flex-row justify-between">
        <div className="text-zinc-500  m-2">{`Password: ${password}`}</div>
        <Button size={"icon"} onPointerDown={() => setDialog("edit_password")}>
          <Edit />
        </Button>
      </div>
      <h2 className="text-lg font-semibold tracking-tight mt-2">
        Saved discover path
      </h2>
      <div className="px-4 flex flex-row justify-between pb-6">
        <div className="text-zinc-500  m-2">{`Path: ${discover}`}</div>
        <Button size={"icon"} onPointerDown={() => setDiscover(undefined)}>
          <UndoIcon />
        </Button>
      </div>
    </div>
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

function SizeChart({ item }: { item: ChartItem }) {
  return (
    <div className="flex flex-col min-w-[400px] aspect-square bg-card justify-center rounded-md border-card">
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
    <div className={cn("", className)}>
      <div className="flex flex-row">
        <Button
          className="w-full justify-start"
          variant="ghost"
          onPointerDown={setExclusionPaths}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            height="24px"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mr-2 h-4 w-4 fill-foreground"
            viewBox="0 -960 960 960"
            width="24px"
          >
            <path d="M440-440H200v-80h240v-240h80v240h240v80H520v240h-80v-240Z" />
          </svg>
          Add Exclusion Files
        </Button>
        <Button
          className="w-full justify-start"
          variant="ghost"
          onPointerDown={setExclusionDir}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            height="24px"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mr-2 h-4 w-4 fill-foreground"
            viewBox="0 -960 960 960"
            width="24px"
          >
            <path d="M440-440H200v-80h240v-240h80v240h240v80H520v240h-80v-240Z" />
          </svg>
          Add Exclusion Directory
        </Button>
      </div>
      <Card>
        <div className="space-y-1 p-2 overflow-y-auto max-h-[300px]">
          {ignore?.map((path) => {
            return (
              <div
                key={path}
                className="flex flex-row justify-between items-center p-2 rounded-lg hover:bg-primary-foreground"
              >
                <div className="text-zinc-500  m-2">{path}</div>
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
            );
          })}
        </div>
      </Card>
    </div>
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
    <div className={cn("", className)}>
      <Card>
        <div className="space-y-1 p-2 overflow-y-auto max-h-[300px]">
          {available?.map((plugin) => {
            return (
              <div
                key={plugin.path}
                className="flex flex-row justify-between items-center p-2 rounded-lg hover:bg-primary-foreground"
              >
                <div className="flex flex-col">
                  <text className="text-zinc-500  m-2">{plugin.path}</text>
                  <text className="text-zinc-500  m-2">{"LastEvent: " + plugin.lastEvent}</text>
                  <text className="text-zinc-500  m-2">{"Flags: " + plugin.flags}</text>
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
            );
          })}
        </div>
      </Card>
    </div>
  );
}

function SettingsDirItem(props: {
  name: string;
  setDir: () => void;
  dir: string | undefined;
}) {
  return (
    <div className="flex flex-row justify-between items-center m-2 rounded-lg hover:bg-primary-foreground">
      <div className="flex flex-col m-2">
        <h2 className="space-y-1 text-primary">{props.name}</h2>
        <div className="text-zinc-500">{props.dir?.ifEmpty(() => "unset")}</div>
      </div>
      <Button size="icon" className="mx-2" onPointerDown={props.setDir}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          height="24px"
          viewBox="0 -960 960 960"
          width="24px"
        >
          <path d="M200-200h57l391-391-57-57-391 391v57Zm-80 80v-170l528-527q12-11 26.5-17t30.5-6q16 0 31 6t26 18l55 56q12 11 17.5 26t5.5 30q0 16-5.5 30.5T817-647L290-120H120Zm640-584-56-56 56 56Zm-141 85-28-29 57 57-29-28Z" />
        </svg>
      </Button>
    </div>
  );
}


const games: {
  [keyof: number]: {
    game: string,
    icon: LucideIcon
  }
} = {
  1: { game: "Genshin Impact", icon: SparkleIcon },
  2: { game: "Honkai Star Rail", icon: TrainIcon },
  3: { game: "Zenless Zone Zero", icon: GlobeIcon },
  4: { game: "Wuthering Waves", icon: WavesIcon },
};


// TODO download updated files
function UpdatesDialog(
  { open, onOpenChange }: {
    open: boolean,
    onOpenChange: (open: boolean) => void
  }
) {

  const [retry, setRetry] = useState(0)
  const [inProgress, setInProgress] = useState<Set<string>>(new Set())

  const { loading, error, value } = useStateProducerT<types.Update[]>([], async (update) => {
    const updates = await GetUpdates()
    update(updates)
  }, [retry])

  const downloadItem = (update: types.Update) => {
    setInProgress((p) => {
      p.add(update.newest.dl)
      return new Set(p)
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[60%] min-h-[80%]">
        <DialogHeader>
          <DialogTitle>Mod fix updates</DialogTitle>
          <DialogDescription>Select updates for mod fix executables</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center">
          {loading ? (
            <div className="flex flex-row items-center justify-end gap-2 text-4xl text-muted-foreground p-2 mx-2">
              <svg
                className="h-[32px] w-[32px] animate-spin"
                xmlns="http://www.w3.org/2000/svg"
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
              {!value.isEmpty() ? "Refreshing" : "Loading..."}
            </div>
          ) : undefined}
          {error ? (
            <>
              <text className="text-4xl text-red-300">{error.message.ifEmpty(() => "Unkown error")}</text>
              <Button onClick={() => setRetry((r) => r + 1)}>Retry</Button>
            </>
          ) : undefined}
          {value.isEmpty() ? undefined : (
            <Card className="min-w-[100%]">
              <div className="space-y-1 p-2 overflow-y-auto max-h-[100%]">
                <ScrollArea className="">
                  {value.map((v) => {
                    return (
                      <div
                        key={v.game}
                        className="flex flex-row justify-between items-center p-2 rounded-lg hover:bg-primary-foreground"
                      >
                        <div className="flex flex-col">
                          <text className="m-2">{games[v.game]["game"]}</text>
                          <text className="text-zinc-500  m-2">{`Current: ${v.current}`}</text>
                          <text className="text-zinc-500  m-2">{`Newest: ${v.newest.name}`}</text>
                        </div>
                        <Button
                          onClick={() => { }}
                        >
                          <DownloadIcon />
                        </Button>
                      </div>
                    )
                  })}
                </ScrollArea>
              </div>
            </Card>)}
        </div>
        <DialogFooter className="sm:justify-start">
          <DialogClose asChild>
            <Button type="button" variant="destructive">
              Cancel
            </Button>
          </DialogClose>
          <DialogClose asChild>
            <Button
              type="button"
              variant="default"
            >
              Confirm
            </Button>
          </DialogClose>

          <Button
            type="button"
            variant="secondary"
            onClick={() => setRetry((r) => r + 1)}
          >
            Refresh
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}