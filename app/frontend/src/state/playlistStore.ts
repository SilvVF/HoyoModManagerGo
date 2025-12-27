import { types } from "../../wailsjs/go/models";
import { create } from "zustand";
import { Game } from "@/data/dataapi";
import DB from "@/data/database";

export type PlaylistState = {
  playlists: PlaylistMap;
  updates: number;
  init: () => Promise<void>;
  create: (game: number, name: string) => Promise<void>;
  enable: (game: number, id: number) => Promise<void>;
  delete: (id: number) => Promise<void>;
  refresh: (game: number) => Promise<void>;
  rename: (id: number, game: number, name: string) => Promise<void>;
  renamePlaylist: (playlist: types.Playlist, name: string) => Promise<void>;
};

type PlaylistMap = { [game: number]: types.PlaylistWithModsAndTags[] };
const initailPlaylists = () => {
  const lists: PlaylistMap = {};
  lists[Game.Genshin] = [];
  lists[Game.StarRail] = [];
  lists[Game.ZZZ] = [];
  lists[Game.WuWa] = [];

  return lists;
};

const games = [Game.Genshin, Game.StarRail, Game.ZZZ, Game.WuWa];

export const usePlaylistStore = create<PlaylistState>((set, get) => ({
  playlists: initailPlaylists(),
  create: async (game, name) => {
    DB.mutations.createPlaylist(game, name).then(() => get().refresh(game));
  },
  updates: 0,
  enable: async (game, id) => {
    const playlist = get().playlists[game].find((p) => p.playlist.id === id);
    if (playlist === undefined) return;
    DB.mutations
      .enableMods(
        playlist.modsWithTags.map(({ mod }) => mod.id),
        game,
      )
      .then(() => {
        set((state) => ({ updates: state.updates + 1 }));
      });
  },
  init: async () => {
    const lists = await Promise.all(
      games.flatMap((i) =>
        DB.queries.selectPlaylistWithModsAndTags(i).then((v) => {
          return { k: i, v: v };
        }),
      ),
    );
    const data: PlaylistMap = {};
    for (let { k, v } of lists) {
      data[k] = v;
    }
    set({
      playlists: data,
    });
  },
  refresh: async (game: number) => {
    DB.queries.selectPlaylistWithModsAndTags(game).then((value) => {
      set((prev) => {
        const copy = prev.playlists;
        copy[game] = value;
        return {
          playlists: copy,
        };
      });
    });
  },
  delete: async (id: number) => {
    DB.mutations.deletePlaylistById(id).then(() => get().init());
  },
  renamePlaylist: async (playlist: types.Playlist, name: string) => {
    get().rename(playlist.id, playlist.game, name);
  },
  rename: async (id: number, game: number, name: string) => {
    if (name.isBlank()) {
      return;
    }

    DB.mutations.updatePlaylistName(id, name).then(() => get().refresh(game));
  },
}));
