import { EventsOn } from "wailsjs/runtime/runtime";
import { create } from "zustand";
import * as ServerManager from "wailsjs/go/server/ServerManager"
import { CancelFn } from "@/lib/tsutils";

interface ServerState {
    running: boolean,
    addr: string,
    listen: () => CancelFn,
    shutdown: () => void,
    start: () => void,
    restart: () => void
}

type ServerEvent =  "server_stopped" |  "server_started"

export const useServerStore = create<ServerState>((set) => ({
   running: false,
   addr: "",
   listen: () => {
      ServerManager.GetLocalIp().then((ip) => set(({addr: (ip ?? "")})))
      const cancel = EventsOn(
        'server_event',
         (data) => {
            try {
                const event = data as ServerEvent
                if (event === "server_started") {
                    set(() => ({
                        running: true
                    }))
                } else if (event === "server_stopped") {
                    set(() => ({
                        running: false,
                    }))
                }
            } catch(e) {}
        })
        return cancel
   },
   shutdown: ServerManager.Stop,
   start: ServerManager.Start,
   restart: ServerManager.Restart, 
}))