import { Button } from "@/components/ui/button";
import { GoPref, usePrefQuery } from "@/data/prefs";
import { EditIcon } from "lucide-react";
import { ComponentProps } from "react";
import { GetExportDirectory } from "wailsjs/go/main/App";

export function SettingsDirItem({
  name,
  path,
  onEditClick,
  ...rest
}: {
  name: string;
  path: string;
  onEditClick?: () => void;
} & ComponentProps<"div">) {
  return (
    <div
      className="m-2 flex flex-row items-center justify-between hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50"
      {...rest}
    >
      <div className="m-2 flex flex-col">
        <h2 className="space-y-1 text-primary">{name}</h2>
        <div className="text-foreground/75">{path}</div>
      </div>
      {onEditClick ? (
        <Button size="icon" className="mx-2" onPointerDown={onEditClick}>
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
  const [{ data }, setDir] = usePrefQuery(pref);

  const openDirectoryDialog = async () => {
    const dir = await GetExportDirectory();

    if (dir) {
      setDir(() => dir);
    }
  };

  return (
    <SettingsDirItem
      name={title}
      onEditClick={openDirectoryDialog}
      path={data ?? ""}
      {...rest}
    />
  );
}
