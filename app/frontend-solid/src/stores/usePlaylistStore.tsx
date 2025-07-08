import DB, { useDbUpdateListener } from "@/data/database";
import {
  createContext,
  onCleanup,
  onMount,
  ParentProps,
  useContext,
} from "solid-js";
import { createStore, reconcile } from "solid-js/store";
import { types } from "wailsjs/go/models";

export type PlaylistState = {
  playlists: types.Playlist[];
  events: {
    create: (game: number, name: string) => Promise<void>;
    enable: (id: number, game: number) => Promise<void>;
    delete: (id: number) => Promise<void>;
    refresh: () => Promise<void>;
    rename: (id: number, name: string) => Promise<void>;
  };
};

const PlaylistContext = createContext<PlaylistState>();

export function PlaylistProvider(props: ParentProps) {
  const [store, setStore] = createStore<PlaylistState>({
    playlists: [],
    events: {
      create: async (game, name) => {
        DB.mutation.createPlaylist(game, name);
      },
      enable: async (id, game) => {
        DB.mutation.enablePlaylist(id, game);
      },
      delete: async (id: number) => {
        DB.mutation.deletePlaylistById(id);
      },
      refresh: async () => {
        const playlists = await DB.selectPlaylists();
        setStore("playlists", reconcile(playlists));
      },
      rename: async (id, name) => {
        DB.mutation.updatePlaylistName(id, name);
      },
    },
  });

  useDbUpdateListener(["playlist"], async () => store.events.refresh(), true);

  return (
    <PlaylistContext.Provider value={store}>
      {props.children}
    </PlaylistContext.Provider>
  );
}

export function usePlaylistStore() {
  return useContext(PlaylistContext)!;
}
