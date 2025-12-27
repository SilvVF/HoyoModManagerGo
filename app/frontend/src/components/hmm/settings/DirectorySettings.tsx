import {
  genshinDirPref,
  honkaiDirPref,
  rootModDirPref,
  usePrefQuery,
  wuwaDirPref,
  zzzDirPref,
} from "@/data/prefs";
import { cn } from "@/lib/utils";
import { ComponentProps, useMemo } from "react";
import { SettingsHeading, SettingsSubheading } from "./SettingsHeadings";
import { DirUpdate, SettingsDirItem } from "./SettingsDirItem";
import { OpenDirectoryDialog } from "wailsjs/go/main/App";
import { useModTransferStore } from "@/state/modTransferStore";
import { MigrateModsDirDialog } from "@/components/ModTransferFlow";
import { ChartItem } from "@/state/useStatsState";
import { Game } from "@/data/dataapi";

export const DirectorySettings = (props: ComponentProps<"div">) => {
  const items = useMemo(
    () => [
      {
        id: Game.StarRail,
        name: "Honkai Star Rail",
        pref: honkaiDirPref,
      },
      {
        id: Game.Genshin,
        name: "Genshin Impact",
        pref: genshinDirPref,
      },
      {
        id: Game.WuWa,
        name: "Wuthering Waves",
        pref: wuwaDirPref,
      },
      {
        id: Game.ZZZ,
        name: "Zenless Zone Zero",
        pref: zzzDirPref,
      },
    ],
    [],
  );

  return (
    <div {...props} className={cn(props.className, "flex flex-col")}>
      <SettingsHeading>Directory Settings</SettingsHeading>
      <SettingsSubheading>Output dirs</SettingsSubheading>
      {items.map(({ id, name, pref }) => (
        <DirUpdate key={id} title={name} pref={pref} />
      ))}
      <RootModDirTransferFlow />
    </div>
  );
};

const RootModDirTransferFlow = ({ stats }: { stats?: ChartItem }) => {
  const [{ data }] = usePrefQuery(rootModDirPref);
  const startTranfer = useModTransferStore((s) => s.start);
  const transferInProgress = useModTransferStore((s) => s.state !== "idle");

  const getNewRootModDir = async () => {
    const dir = await OpenDirectoryDialog("select a dir to store mods", []);
    if (!dir || dir.length <= 0) return;
    startTranfer(dir);
  };

  return (
    <>
      <MigrateModsDirDialog stats={stats} open={transferInProgress} />
      <SettingsDirItem
        name="Root mod dir"
        onEditClick={getNewRootModDir}
        path={data ?? ""}
      />
    </>
  );
};
