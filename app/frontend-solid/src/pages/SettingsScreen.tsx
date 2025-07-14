import { DirUpdate, SettingsDirItem } from "@/components/hmm/SettingsDirItem";
import { Button } from "@/components/ui/button";
import {
  genshinDirPref,
  GoPref,
  honkaiDirPref,
  rootModDirPref,
  usePreferenceSignal,
  wuwaDirPref,
  zzzDirPref,
} from "@/data/prefs";
import { cn } from "@/libs/cn";
import { useModTransferStore } from "@/stores/useModTransferStore";
import {
  Component,
  ComponentProps,
  createEffect,
  For,
  ParentProps,
} from "solid-js";
import { OpenDirectoryDialog } from "wailsjs/go/main/App";

export const SettingsScreen: Component = () => {
  return (
    <div class="flex flex-col w-full h-full">
      <DirectorySettings />
    </div>
  );
};

const SettingsHeading = (props: ParentProps) => {
  return (
    <div class="text-2xl font-bold text-foreground hover:underline">
      {props.children}
    </div>
  );
};

const SettingsSubheading = (props: ParentProps) => {
  return (
    <div class="flex flex-row text-xl font-semibold text-foreground/75 hover:underline">
      {props.children}
    </div>
  );
};

const DirectorySettings = (props: ComponentProps<"div">) => {
  const items: { name: string; pref: GoPref<string> }[] = [
    {
      name: "Honkai Star Rail",
      pref: honkaiDirPref,
    },
    {
      name: "Genshin Impact",
      pref: zzzDirPref,
    },
    {
      name: "Wuthering Waves",
      pref: wuwaDirPref,
    },
    {
      name: "Zenless Zone Zero",
      pref: zzzDirPref,
    },
  ];

  return (
    <div {...props} class={cn(props.class, "flex flex-col")}>
      <SettingsHeading>Directory Settings</SettingsHeading>
      <SettingsSubheading>Output dirs</SettingsSubheading>
      <For each={items}>
        {({ name, pref }) => <DirUpdate title={name} pref={pref} />}
      </For>
      <RootModDirTransferFlow />
    </div>
  );
};

const RootModDirTransferFlow = () => {
  const [rootDir, _, invalidate] = usePreferenceSignal("", rootModDirPref);
  const transferStore = useModTransferStore();

  const getNewRootModDir = async () => {
    const dir = await OpenDirectoryDialog("select a dir to store mods", []);
    if (!dir || dir.length <= 0) return;
    transferStore.startTransfer(dir);
  };

  createEffect(() => {
    transferStore.state().type;

    invalidate();
  });

  return (
    <SettingsDirItem
      name="Root mod dir"
      onEditClick={getNewRootModDir}
      path={rootDir()}
    />
  );
};
