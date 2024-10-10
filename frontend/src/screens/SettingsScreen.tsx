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
} from "@/data/prefs";
import {
  GetExportDirectory,
  GetExclusionPaths,
} from "../../wailsjs/go/main/App";
import { Card } from "@/components/ui/card";
import { cn, useStateProducer } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";
import { useEffect, useState } from "react";
import { Edit, PlayIcon, RefreshCwIcon, StopCircleIcon, UndoIcon } from "lucide-react";
import { getStats } from "@/data/stats";
import { types } from "wailsjs/go/models";
import { ModSizeChart } from "@/components/mod-size-chart";
import { ChartConfig } from "@/components/ui/chart";
import { NameDialog } from "./GameScreen";
import { useServerStore } from "@/state/serverStore";
import { useShallow } from "zustand/shallow";

// Helper function to generate random HSL color
function getRandomColor(): string {
  const hue = Math.floor(Math.random() * 360); // Random hue value between 0 and 360
  const saturation = Math.floor(Math.random() * 100); // Random saturation value between 0 and 100
  const lightness = Math.floor(Math.random() * 80) + 20; // Lightness between 20 and 100 to avoid very dark or very light colors
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

function bytesToMB(bytes: number): number {
  return bytes / (1024 * 1024); // 1024 * 1024 = 1,048,576
}

// Transformation function
function transformDownloadStatsToChartData(
  data: types.FileInfo[]
) {
  const chartData = data
    .map((fileInfo: types.FileInfo) => {
      const split = fileInfo.file.split("\\");
      return {
        file: split[split.length - 1],
        size: bytesToMB(fileInfo.bytes),
        fill: getRandomColor(),
      };
    });

  const chartConfig = {
    visitors: { label: "Visitors" },
    ...chartData.reduce((acc, { file, fill }) => {
      acc[file] = {
        label: capitalizeFirstLetter(file), // Use file name for label
        color: fill, // Assign the generated random color
      };
      return acc;
    }, {} as Record<string, { label: string; color: string }>),
  };

  return { chartData, chartConfig };
}

// Helper function to capitalize browser (file) names
function capitalizeFirstLetter(string: string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

type ChartItem = {
  game: string,
  config: ChartConfig, 
  total: number,
  data:  {
    file: string;
    size: number;
    fill: string
  }[]
}

type SettingsDialog = "edit_port"

export default function SettingsScreen() {
  const [honkaiDir, setHonkaiDir] = usePrefrenceAsState(honkaiDirPref);
  const [genshinDir, setGenshinDir] = usePrefrenceAsState(genshinDirPref);
  const [discover, setDiscover] = usePrefrenceAsState(discoverGamePref);
  const [wuwaDir, setWuwaDir] = usePrefrenceAsState(wuwaDirPref);
  const [zzzDir, setZZZdir] = usePrefrenceAsState(zzzDirPref);
  const [ignore, setIgnore] = usePrefrenceAsState(ignorePref);
  const [serverPort, setServerPort] = usePrefrenceAsState(serverPortPref);
  const [maxDownloadWorkers, setMaxDownloadWorkers] = usePrefrenceAsState(
    maxDownloadWorkersPref
  );

  const [sliderValue, setSliderValue] = useState(maxDownloadWorkers ?? 1);

  useEffect(
    () => setSliderValue(maxDownloadWorkers ?? 1),
    [maxDownloadWorkers]
  );

  const stats = useStateProducer<ChartItem[] | undefined>(
    undefined,
    async (update) => {
      const stats = await getStats()

      const charts = stats.data.map((data) => {
        const split = data[0].file.split("\\")
        let game = split[split.length - 1]
        const { chartData, chartConfig } = transformDownloadStatsToChartData(data.slice(1, data.length));

        return ({
          game: game,
          config: chartConfig,
          data: chartData,
          total: data.reduce((acc, curr) => acc + curr.bytes, 0)
        }) as ChartItem
      });

      update(charts)
    },
    []
  );

  const items = [
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
  ];

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

  const [dialog, setDialog] = useState<SettingsDialog | undefined>(undefined)

  const dialogSettings: { [key: string]: { title: string, description: string, onSuccess: (value: string) => void } } = {
    "edit_port": {
      title: "Edit port number",
      description: "change the port number the http server for external apps will run on (1024 - 49151)",
      onSuccess: (port: string) => {
          try {
            const pNum = Math.max(Math.min(1024, Number(port)), 49151)
            setServerPort(pNum)
          } catch {}
      }
    }
  }

  const dialogSetting = dialog !== undefined ? dialogSettings[dialog] : undefined

  return (
    <div className="w-full px-4 overflow-hidden mb-12">
      <NameDialog
            title={dialogSetting?.title ?? ""}
            description={dialogSetting?.description ?? ""}
            open={dialog !== undefined} 
            onOpenChange={() => setDialog(undefined)} 
            onSuccess={(n) => dialogSetting!!.onSuccess(n) } 
          />
      <h1 className="text-2xl font-bold my-4">Settings</h1>
      <div 
          className="max-w-screen w-full h-full flex flex-row overflow-x-scroll"
          >
      {
        stats?.map((data) => {
          return <SizeChart item={data} />
        })   
      }
      </div>
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
      <h2 className="text-lg font-semibold tracking-tight mt-4">
        Max download workers
      </h2>
      <div className="text-zinc-500  m-2">
        Requires restart for change to take effect
      </div>
      <div className="px-4 flex flex-row justify-between">
        {maxDownloadWorkers ? <Slider
          className="w-3/4"
          defaultValue={[maxDownloadWorkers]}
          max={10}
          min={1}
          step={1}
          onValueChange={(value) => setSliderValue(value[0])}
          onValueCommit={(value) => setMaxDownloadWorkers(value[0])}
        /> : undefined}
        <div className="text-lg font-semibold tracking-tight mx-4">{`Max workers: ${sliderValue} `}</div>
      </div>
      <h2 className="text-lg font-semibold tracking-tight mt-4">
        Http server
      </h2>
      <div className="px-4 flex flex-row justify-between">
        <div className="text-zinc-500  m-2">{`Port: ${serverPort}`}</div>
        <Button size={"icon"} onPointerDown={() => setDialog("edit_port")}>
          <Edit />
        </Button>
        <ServerActions />
      </div>
      <h2 className="text-lg font-semibold tracking-tight mt-4">
        Saved discover path
      </h2>
      <div className="px-4 flex flex-row justify-between">
        <div className="text-zinc-500  m-2">{`Path: ${discover}`}</div>
        <Button size={"icon"} onPointerDown={() => setDiscover(undefined)}>
          <UndoIcon />
        </Button>
      </div>
    </div>
  );
}

function ServerActions() {

  const serverRunning = useServerStore(useShallow(state => state.running))

  const startServer = useServerStore(state => state.start)
  const restartServer = useServerStore(state => state.restart)
  const stopServer = useServerStore(state => state.shutdown)


  if (serverRunning) {
    return (
      <div className="flex flex-row space-y-1">
      <Button size={"icon"} onClick={restartServer}>
        <RefreshCwIcon />
      </Button>
      <Button size={"icon"} onClick={stopServer}>
        <StopCircleIcon />
      </Button>
    </div>
    )
  }

  return (
    <div>
       <Button size={"icon"} onClick={startServer}>
        <PlayIcon />
      </Button> 
    </div>
  )
}

function SizeChart({ item }: { item: ChartItem }) {
  return (
      <div className="min-w-[400px]">
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
