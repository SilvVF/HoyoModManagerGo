import { range } from "@/lib/utils";
import { CreatePlaylist, DeletePlaylistById, SelectPlaylistWithModsAndTags, UpdateModsEnabledFromSlice } from "../../wailsjs/go/core/DbHelper";
import { types } from "../../wailsjs/go/models";
import { create } from "zustand";

export type PlaylistState = {
    playlists: {
        [game: number]: types.PlaylistWithModsAndTags[]
    },
    updates: number
    init: () => Promise<void>
    create: (game: number, name: string) => Promise<void>
    enable: (game: number, id: number) => Promise<void>
    delete: (id: number) => Promise<void>
    refresh: (game: number) => Promise<void>
}


export const usePlaylistStore = create<PlaylistState>((set, get) => ({
    playlists: {1: [],  2: [], 3: [], 4: []},
    create: async (game, name) => {
        CreatePlaylist(game, name).then(() => get().refresh(game));
    },
    updates: 0,
    enable: async (game, id) => {
        const playlist = get().playlists[game].find((p) => p.playlist.id === id)
        if (playlist === undefined) return
        UpdateModsEnabledFromSlice(
            playlist.modsWithTags.map(({ mod }) => mod.id),
            game
        ).then(() => {
            set((state) => ({ updates: state.updates + 1}))
        })
    },
    init: async () => {
        const playlistList = await Promise.all(
            range(1, 4).flatMap((i) => SelectPlaylistWithModsAndTags(i))
        );
        set(() => ({
            playlists: {
                1: playlistList[0],
                2: playlistList[1],
                3: playlistList[2],
                4: playlistList[3],
            }
        }))
    },
    refresh: async (game) => {
        SelectPlaylistWithModsAndTags(game).then((value) => 
            set({ 
                playlists: {  
                    [game]: value 
                }
            })
        );
    },
    delete: async (id) => {
        DeletePlaylistById(id).then(() => get().init())
    }
}))