import { createEffect, createSignal } from "solid-js";
import { DataApi } from "./dataapi";
import * as Generator from "wailsjs/go/core/Generator";
import { EventsOn } from "wailsjs/runtime/runtime";

export const useGenerator = (dataApi: DataApi) => {
  const [reloading, setReloading] = createSignal(false);

  // lazy way to restore the state of generating job TODO: maybe use events
  createEffect(() => {
    const handleGenStarted = () => {
      dataApi.game().then((game) => {
        Generator.IsRunning(game).then((reloading) => {
          setReloading(reloading);
          if (reloading) {
            Generator.AwaitCurrentJob(game).finally(() => setReloading(false));
          }
        });
      });
    };

    handleGenStarted();
    const cancel = EventsOn("gen_started", () => {
      handleGenStarted();
    });

    return () => {
      cancel();
    };
  });

  const reload = async () => {
    setReloading(true);
    Generator.Reload(await dataApi.game())
      .finally(() => setReloading(false))
      .catch();
  };

  return {
    reloading: reloading,
    reload: reload,
  };
};
