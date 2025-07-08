//import CharacterInfoCard from "@/components/hmm/CharacterInfoCard";
import CharacterInfoCard from "@/components/hmm/CharacterInfoCard";
import {
  DataApi,
  GenshinApi,
  StarRailApi,
  WutheringWavesApi,
  ZenlessApi,
} from "@/data/dataapi";
import DB, { useDbUpdateListener } from "@/data/database";
import { cn } from "@/libs/cn";
import { Component, createEffect, For, onCleanup, onMount } from "solid-js";
import { createStore, reconcile } from "solid-js/store";
import { types } from "wailsjs/go/models";
import { LogDebug } from "wailsjs/runtime/runtime";

export const GenshinScreen: Component = () => (
  <GameScreen game={1} dataApi={GenshinApi}></GameScreen>
);
export const StarRailScreen: Component = () => (
  <GameScreen game={2} dataApi={StarRailApi}></GameScreen>
);
export const ZZZScreen: Component = () => (
  <GameScreen game={3} dataApi={ZenlessApi}></GameScreen>
);
export const WuWaScreen: Component = () => (
  <GameScreen game={4} dataApi={WutheringWavesApi}></GameScreen>
);

type GameEvents = {
  onQueryChange: (query: string) => void;
  toggleGrid: () => void;
};

type GameState = {
  characters: types.CharacterWithModsAndTags[];
  query: string;
  grid: boolean;
};

const useGameScreenState = (
  dataApi: DataApi,
  game: number
): { state: GameState; events: GameEvents } => {
  const [state, setState] = createStore<GameState>({
    characters: [],
    query: "",
    grid: true,
  });

  useDbUpdateListener(
    ["characters", "mods", "tags"],
    async () => {
      const characters = await dataApi.charactersWithModsAndTags();
      setState("characters", reconcile(characters));
    },
    true
  );

  return {
    state: state,
    events: {
      onQueryChange: (query) => {
        setState("query", query);
      },
      toggleGrid: () => {
        setState("grid", (grid) => !grid);
      },
    },
  };
};

const GameScreen = (props: { game: number; dataApi: DataApi }) => {
  const { state } = useGameScreenState(props.dataApi, props.game);

  return (
    <div class="w-full h-full flex flex-col items-center justify-center">
      <div>{props.game}</div>
      <CharacterGrid state={state} />
    </div>
  );
};

const CharacterGrid = ({ state }: { state: GameState }) => {
  return (
    <div
      class={cn(
        state
          ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
          : "columns-1 sm:columns-2 lg:columns-3",
        "mx-2 mb-16 gap-4 space-y-4"
      )}
    >
      <For each={state.characters}>
        {(item) => <CharacterInfoCard cwmt={item} />}
      </For>
    </div>
  );
};
