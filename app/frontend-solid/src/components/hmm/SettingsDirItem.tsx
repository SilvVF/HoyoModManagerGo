import { EditIcon } from "lucide-solid";
import { Button } from "../ui/button";
import { GoPref, usePreferenceSignal } from "@/data/prefs";
import { GetExportDirectory } from "wailsjs/go/main/App";
import { Accessor, ComponentProps, createMemo } from "solid-js";

export function SettingsDirItem(
  props: {
    name: string;
    path: string;
    onEditClick?: () => void;
  } & ComponentProps<"div">
) {
  const pathname = createMemo(() =>
    props.path.length > 0 ? props.path : "unset"
  );

  return (
    <div
      class="flex flex-row justify-between items-center m-2 hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50"
      {...props}
    >
      <div class="flex flex-col m-2">
        <h2 class="space-y-1 text-primary">{props.name}</h2>
        <div class="text-foreground/75">{pathname()}</div>
      </div>
      {props.onEditClick ? (
        <Button size="icon" class="mx-2" onPointerDown={props.onEditClick}>
          <EditIcon />
        </Button>
      ) : undefined}
    </div>
  );
}

export function DirUpdate({
  pref,
  title,
  ...rest
}: {
  pref: GoPref<string>;
  title: string;
} & ComponentProps<"div">) {
  const [dir, setDir] = usePreferenceSignal("", pref);

  const openDirectoryDialog = async () => {
    const dir = await GetExportDirectory();

    if (dir) {
      setDir(dir);
    }
  };

  return (
    <SettingsDirItem
      name={title}
      onEditClick={openDirectoryDialog}
      path={dir()}
      {...rest}
    />
  );
}
