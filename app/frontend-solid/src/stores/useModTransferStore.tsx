import {
  Accessor,
  createContext,
  createEffect,
  createMemo,
  createSignal,
  Match,
  onCleanup,
  onMount,
  ParentProps,
  Setter,
  Show,
  Switch,
  useContext,
} from "solid-js";
import {
  createStore,
  produce,
  reconcile,
  SetStoreFunction,
  unwrap,
} from "solid-js/store";
import { rootModDirPref } from "@/data/prefs";
import {
  CancelDirChange,
  ChangeRootModDir,
  RemoveOldModDir,
} from "wailsjs/go/main/App";
import { EventsOn, LogDebug } from "wailsjs/runtime/runtime";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { SettingsDirItem } from "@/components/hmm/SettingsDirItem";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { formatBytes } from "@/libs/tsutils";

const ModTransferContext = createContext<ModTransferStore>();

const CHANGE_EVENT = "change_dir";
type E_TYPE = "progress" | "error" | "finished";

export type TransferState =
  | { type: "idle" }
  | {
      type: "confirm";
      prev: string | undefined;
      neww: string;
    }
  | {
      type: "loading";
      transfer: boolean;
      prev: string | undefined;
      neww: string;
      progress: TransferProgress;
    }
  | {
      type: "error";
      message: string;
    }
  | {
      type: "success";
      prev: string | undefined;
      neww: string;
    };

export type TransferProgress = {
  total: number;
  progress: number;
};

type ModTransferStore = {
  state: Accessor<TransferState>;
  startTransfer: (dir: string) => void;
};

export const ModTransferStoreProvider = (props: ParentProps) => {
  const [transferState, setTransferState] = createSignal<TransferState>({
    type: "idle",
  });

  const startTransfer = async (dir: string) => {
    const prevDir = await rootModDirPref.Get();

    setTransferState({
      type: "confirm",
      prev: prevDir.length === 0 ? undefined : prevDir,
      neww: dir,
    });
  };

  const content = createMemo(() => {
    const s = transferState();
    switch (s.type) {
      case "confirm":
        return <ConfirmContent state={s} setState={setTransferState} />;
      case "success":
        return <SuccessContent state={s} setStore={setTransferState} />;
      case "error":
        return <ErrorContent state={s} setState={setTransferState} />;
      case "loading":
        return <LoadingContent state={s} setState={setTransferState} />;
      default:
        return null;
    }
  });

  const dialogOpen = createMemo(() => transferState().type !== "idle");

  return (
    <ModTransferContext.Provider
      value={{
        state: transferState,
        startTransfer: startTransfer,
      }}
    >
      <Dialog open={dialogOpen()} onOpenChange={() => {}}>
        <DialogContent>{content()}</DialogContent>
      </Dialog>
      {props.children}
    </ModTransferContext.Provider>
  );
};

export const useModTransferStore = (): ModTransferStore =>
  useContext(ModTransferContext)!;

const SuccessContent = (props: {
  state: Extract<TransferState, { type: "success" }>;
  setStore: Setter<TransferState>;
}) => {
  const onDone = () => {
    props.setStore({ type: "idle" });
  };

  const [deleted, setDeleted] = createSignal(false);
  const [deleteErr, setDeleteErr] = createSignal("");

  const onDelete = () => {
    RemoveOldModDir(props.state.prev ?? "")
      .then(() => {
        setDeleted(true);
        setDeleteErr("");
      })
      .catch((e) => {
        setDeleted(false);
        setDeleteErr(`${e}`);
      });
  };

  return (
    <>
      <div class="flex flex-col h-full min-w-full justify-center items-center">
        <p class="text-xl font-semibold">Successfully moved mods dir</p>
        <SettingsDirItem name="Root Mods dir" path={props.state.neww} />
        <Show when={props.state.prev}>
          <p class="p-6">
            Select whether to delete
            <span class="text-primary font-bold">{props.state.prev}</span>{" "}
            <br />
            Otherwise select continue without deleting and manually delete it
          </p>
        </Show>
        <Show when={deleted()}>
          <p class="p-6">Deleted old dir</p>
        </Show>
      </div>
      <DialogFooter>
        <Show when={!deleted()}>
          <Button variant="destructive" onClick={onDelete}>
            Delete old dir
          </Button>
        </Show>
        <Button variant="default" onClick={onDone}>
          Done
        </Button>
      </DialogFooter>
    </>
  );
};

const LoadingContent = (props: {
  state: Extract<TransferState, { type: "loading" }>;
  setState: Setter<TransferState>;
}) => {
  const progressValue = createMemo(() => {
    return props.state.progress.total !== 0
      ? (props.state.progress.progress / props.state.progress.total) * 100
      : 0;
  });

  const progressText = createMemo(() => {
    const currBytes = formatBytes(props.state.progress.progress);
    const totalBytes = formatBytes(props.state.progress.total);
    return `${currBytes} / ${totalBytes}`;
  });

  const cancelDirChange = () => {
    CancelDirChange().catch();
  };

  const cancel = EventsOn(
    CHANGE_EVENT,
    (type: E_TYPE, data: TransferProgress) => {
      props.setState((prev) => {
        if (prev.type === "loading") {
          return {
            ...prev,
            progress: {
              total: data.total,
              progress: data.progress,
            },
          };
        } else {
          return prev;
        }
      });
    }
  );

  onCleanup(cancel);

  return (
    <>
      <div class="flex flex-col h-full w-full justify-center items-center p-4">
        <div class="flex flex-row items-center w-full justify-start space-x-2">
          <Progress value={progressValue()} class="w-[75%] h-6" />
          <div class="flex flex-col">
            <div>{"Transfering mods"}</div>
            <div class="text-sm">{progressText()}</div>
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button variant="destructive" onClick={cancelDirChange}>
          Cancel
        </Button>
      </DialogFooter>
    </>
  );
};

const ErrorContent = (props: {
  state: Extract<TransferState, { type: "error" }>;
  setState: Setter<TransferState>;
}) => {
  const cancel = () => {
    props.setState({
      type: "idle",
    });
  };

  return (
    <>
      <div class="flex flex-col h-full min-w-full justify-center items-center">
        <text class="text-xl font-semibold">
          An error occured while transfering: {props.state.message}.
        </text>
      </div>
      <DialogFooter>
        <Button variant="destructive" onClick={cancel}>
          Cancel
        </Button>
      </DialogFooter>
    </>
  );
};

const ConfirmContent = (props: {
  state: Extract<TransferState, { type: "confirm" }>;
  setState: Setter<TransferState>;
}) => {
  const onConfirm = async (transfer: boolean) => {
    const { neww, prev } = props.state;

    if (transfer) {
      props.setState({
        type: "loading",
        transfer: transfer,
        neww: neww,
        prev: prev,
        progress: { progress: 0, total: 0 },
      });
    }

    try {
      await ChangeRootModDir(props.state.neww, transfer);
      props.setState({
        type: "success",
        neww: neww,
        prev: prev,
        deleted: false,
        deletedErr: undefined,
      });
    } catch {
      props.setState({
        type: "error",
        message: "failed to change mod dir",
      });
    }
  };

  const onCancel = () => {
    props.setState({ type: "idle" });
  };

  return (
    <>
      <div class="flex flex-row h-fit">
        <div class="flex flex-col">
          <p class="p-6 text-lg font-semibold">
            Confirm whether you want to transfer the mods from
            <span class="text-primary font-bold">Current location </span> to
            <span class="text-primary font-bold">New Location </span>. This
            transfer will copy all mods to
            <span class="text-primary font-bold">New Location</span> and
            <span class="underline">prompt you to clear</span> the old folder
            after a successful transfer. If you don't want to transfer, you can
            <span class="underline">manually set the destination</span>
            and move the mods yourself.
          </p>
          {props.state.prev ? (
            <SettingsDirItem name="Current location" path={props.state.prev} />
          ) : undefined}
          <SettingsDirItem name="New location" path={props.state.neww} />
        </div>
      </div>
      <DialogFooter>
        <Button variant="secondary" onClick={() => onConfirm(false)}>
          Change without Transfer
        </Button>
        {props.state.prev ? (
          <Button variant="default" onClick={() => onConfirm(true)}>
            Change and Transfer
          </Button>
        ) : undefined}
        <Button variant="destructive" onClick={onCancel}>
          Cancel
        </Button>
      </DialogFooter>
    </>
  );
};
