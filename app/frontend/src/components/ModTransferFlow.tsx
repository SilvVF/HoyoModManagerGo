import { formatBytes } from "@/lib/tsutils";
import { TransferState, useModTransferStore } from "@/state/modTransferStore";
import { ChartItem } from "@/state/useStatsState";
import { useShallow } from "zustand/shallow";
import { SettingsDirItem } from "./SettingsDirItem";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import {
  DialogHeader,
  DialogFooter,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { Skeleton } from "./ui/skeleton";
import { SizeChart } from "@/screens/SettingsScreen";
import { Progress } from "./ui/progress";
import { useQueryClient } from "@tanstack/react-query";

export const transferText: {
  [key in TransferState]: {
    title: string;
    description: string;
  };
} = {
  confirm: {
    title: "Confirm transfer",
    description: "would you like to transfer all current mods to the new dest",
  },
  idle: {
    title: "Loading",
    description: "setting up mod transfer",
  },
  loading: {
    title: "Transfer in progress",
    description: "moving all mods to the new destination",
  },
  success: {
    title: "Transfer Complete",
    description: "all mods moved to new destintation",
  },
  error: {
    title: "Failed to transfer",
    description: "an error occured while transfering mods",
  },
  delete: {
    title: "Delete old dir",
    description: "Delete old dir",
  },
};

export type TransferAction = {
  pos: boolean;
  text: string;
  inProgress?: boolean;
  action: () => void;
};

export function useModTransferActions(): TransferAction[] {
  const state = useModTransferStore(useShallow((state) => state.state));
  const start = useModTransferStore((state) => state.start);
  const confirm = useModTransferStore((state) => state.confirm);
  const deleting = useModTransferStore(useShallow((state) => state.deleting));
  const queryClient = useQueryClient();

  const pendingDelete = useModTransferStore(
    useShallow((state) => state.pendingDelete),
  );
  const clearOldDir = useModTransferStore(
    useShallow((state) => state.clearOldDir),
  );

  const closeDialog = useModTransferStore((state) => state.resetStore);

  if (state === "loading") {
    return [];
  } else if (state === "confirm") {
    return [
      { pos: false, text: "Cancel", action: closeDialog },
      {
        pos: true,
        text: "Set without Transfer",
        action: () => confirm(false, queryClient),
      },
      { pos: true, text: "Transfer", action: () => confirm(true, queryClient) },
      { pos: true, text: "Transfer", action: () => confirm(true, queryClient) },
    ];
  } else if (state === "success") {
    return [
      {
        pos: false,
        text: "Delete old directory",
        action: clearOldDir,
        inProgress: deleting,
      },
      { pos: true, text: "Continue without deleting", action: closeDialog },
    ];
  } else if (state === "error") {
    return [
      { pos: false, text: "Cancel", action: closeDialog },
      { pos: true, text: "Retry", action: () => start },
    ];
  } else if (state === "delete" && pendingDelete !== undefined) {
    return [
      { pos: false, text: "Continue without deleting", action: closeDialog },
      {
        pos: true,
        text: "Retry Deleting old directory",
        action: clearOldDir,
        inProgress: deleting,
      },
    ];
  } else if (state === "delete" && pendingDelete === undefined) {
    return [{ pos: true, text: "Complete", action: closeDialog }];
  }
  return [{ pos: false, text: "Cancel", action: closeDialog }];
}

export function MigrateModsDirDialog({
  open,
  stats,
}: {
  open: boolean;
  stats: ChartItem | undefined;
}) {
  const state = useModTransferStore((state) => state.state);
  const actions = useModTransferActions();

  return (
    <Dialog open={open}>
      <DialogContent className="min-h-[80%] max-w-[60%]">
        <DialogHeader>
          <DialogTitle>{transferText[state]["title"]}</DialogTitle>
          <DialogDescription>
            {transferText[state]["description"]}
          </DialogDescription>
        </DialogHeader>
        <Card className="h-[60vh] w-[100%] overflow-auto">
          <MigrateModsContent state={state} stats={stats} />
        </Card>
        <DialogFooter className="sm:justify-start">
          {actions.map((action) => {
            return (
              <Button
                type="button"
                variant={action.pos ? "default" : "destructive"}
                onClick={action.action}
              >
                {action.text}
              </Button>
            );
          })}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function MigrateModsContent({
  state,
  stats,
}: {
  state: TransferState;
  stats: ChartItem | undefined;
}) {
  const { prevDir, newDir } = useModTransferStore(
    useShallow((state) => ({ prevDir: state.prevDir, newDir: state.newDir })),
  );
  const progress = useModTransferStore(useShallow((state) => state.progress));
  const pendingDelete = useModTransferStore(
    useShallow((state) => state.pendingDelete),
  );

  if (state === "idle") {
    return <Skeleton className="h-96 w-96" />;
  } else if (state === "confirm") {
    return (
      <div className="flex h-fit flex-row">
        <div className="flex flex-col">
          <p className="p-6 text-lg font-semibold">
            Confirm whether you want to transfer the mods from<> </>
            <span className="font-bold text-primary">Current location </span> to
            <> </>
            <span className="font-bold text-primary">New Location </span>. This
            transfer will copy all mods to<> </>
            <span className="font-bold text-primary">New Location</span> and
            <> </>
            <span className="underline">prompt you to clear</span> the old
            folder after a successful transfer. If you don't want to transfer,
            you can<> </>
            <span className="underline">manually set the destination</span>
            <> </>and move the mods yourself.
          </p>
          <SettingsDirItem name="Current location" dir={prevDir} />
          <SettingsDirItem name="New location" dir={newDir} />
        </div>
        {stats ? <SizeChart item={stats} /> : undefined}
      </div>
    );
  } else if (state === "loading") {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center p-4">
        <div className="flex w-full flex-row items-center justify-start space-x-2">
          <Progress
            value={
              progress.total !== 0
                ? (progress.progress / progress.total) * 100
                : 0
            }
            className="h-6 w-[75%]"
          />
          <div className="flex flex-col">
            <div>{"Transfering mods"}</div>
            <div className="text-sm">{`${formatBytes(
              progress.progress,
            )} / ${formatBytes(progress.total)}`}</div>
          </div>
        </div>
      </div>
    );
  } else if (state === "success") {
    return (
      <div className="flex h-full min-w-full flex-col items-center justify-center">
        <text className="text-xl font-semibold">
          Successfully moved mods dir
        </text>
        <SettingsDirItem name="Root Mods dir" dir={prevDir} />
        <text className="p-6">
          Select whether to delete<> </>
          <span className="font-bold text-primary">{pendingDelete}</span>{" "}
          <br></br>Otherwise select continue without deleting and manually
          delete it
        </text>
      </div>
    );
  } else if (state === "error") {
    return (
      <div className="flex h-full min-w-full flex-col items-center justify-center">
        <text className="text-xl font-semibold">
          An error occured while transfering.
        </text>
      </div>
    );
  } else if (state === "delete") {
    if (pendingDelete) {
      return (
        <div className="flex h-full min-w-full flex-col items-center justify-center">
          <text className="text-xl font-semibold">
            An error occured while trying to delete the dir.
          </text>
        </div>
      );
    } else {
      return (
        <div className="flex h-full min-w-full flex-col items-center justify-center">
          <text className="text-xl font-semibold">
            Successfully deleted old dir.
          </text>
        </div>
      );
    }
  }
  return <></>;
}
