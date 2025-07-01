import { Toaster } from "@/components/ui/sonner";
import { ReactNode, useEffect } from "react";
import { toast } from "sonner";
import { EventsOn, LogDebug } from "wailsjs/runtime/runtime";

const ToastLevel = {
  INFO: 1,
  COMPLETE: 2,
  WARN: 3,
  ERROR: 4,
} as const;

const TOAST_EVENT = "toast_event";

type ToastLevel = (typeof ToastLevel)[keyof typeof ToastLevel];

type ToastEvent = {
  level: ToastLevel;
  desc: string;
  msg: string;
};

function showToast(event: ToastEvent) {
  switch (event.level) {
    case ToastLevel.INFO:
      toast(event.msg, {
        description: event.desc,
      });
      break;
    case ToastLevel.COMPLETE:
      toast(event.msg, {
        description: event.desc,
      });
      break;
    case ToastLevel.WARN:
      toast(event.msg, {
        description: event.desc,
      });
      break;
    case ToastLevel.ERROR:
      toast(event.msg, {
        description: event.desc,
      });
      break;
  }
}

export function ToastProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const cancel = EventsOn(TOAST_EVENT, (data: any) => {
      try {
        showToast(data as ToastEvent);
      } catch {
        LogDebug("failed to show " + data);
      }
    });

    return () => {
      cancel();
    };
  }, []);

  return (
    <>
      {children}
      <Toaster />
    </>
  );
}
