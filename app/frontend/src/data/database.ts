import { CancelFn } from "@/lib/tsutils";
import { useEffect } from "react";
import { CreateCustomCharacter, CreatePlaylist, DeleteCharacter, DeleteModById, DeletePlaylistById, DeleteTag, DeleteTextureById, InsertTag, InsertTagForAllModsByCharacterIds, RenameMod, RenameTexture, SelectCharactersByGame, SelectCharacterWithModsTagsAndTextures, SelectClosestCharacter, SelectModById, SelectModsByCharacterName, SelectModsByGbId, SelectPlaylistWithModsAndTags, SelectTagsByModId, UpdateDisableAllModsByGame, UpdateModEnabledById, UpdateModGbId, UpdateModImages, UpdateModsEnabledFromSlice, UpdatePlaylistName, UpdateTextureEnabledById } from "wailsjs/go/dbh/DbHelper";
import { SplitTexture } from "wailsjs/go/main/App";
import { EventsEmit, EventsOn, LogDebug, LogError } from "wailsjs/runtime/runtime";


type DBKey = "characters" | "mods" | "tags" | "playlist" | "all"

const DBEvent = "DB_EVENT"
type DBEventData = DBKey[]

const subscribeToDbUpdates = (key: DBKey[] | DBKey, callback: () => void, runOnStart: boolean = false): CancelFn => {
    const runCallbackCatching = () => {
        try {
            callback()
        } catch (e: any) {
            if (e instanceof Error) {
                LogError("subscribe listener failed with unhandled Error: " + e.message);
            } else {
                LogError("subscribe listener failed with unknown error" + e);
            }
        }
    }

    if (runOnStart) {
        runCallbackCatching()
    }

    return EventsOn(DBEvent, (keys: DBEventData) => {
        LogDebug("received DBEVENT event keys=" + keys)
        if (typeof key === 'string') {
            if (key === "all" || keys.includes(key)) {
                runCallbackCatching()
            }
        } else {
            if (key.any((k) => k === "all" || keys.includes(k))) {
                runCallbackCatching()
            }
        }
    })
}

export const useDbUpdateListener = (key: DBKey[] | DBKey, callback: () => void) => {
    useEffect(() => {
        const cancel = subscribeToDbUpdates(key, callback)

        return () => cancel()
    }, [key])

}

const broadcastCharacterUpdate = () => EventsEmit(DBEvent, ["characters"])
const broadcastModsUpdate = () => EventsEmit(DBEvent, ["mods"])
const broadcastTagsUpdate = () => EventsEmit(DBEvent, ["tags"])
const broadcastPlaylistUpdate = () => EventsEmit(DBEvent, ["playlist"])

//const broadcastMultiUpdate = (keys: DBKey[]) => EventsEmit(DBEvent, keys)
const DB = {
    onValueChangedListener: subscribeToDbUpdates,
    deleteMod: async (id: number) => {
        return DeleteModById(id).then(broadcastCharacterUpdate)
    },
    enableMod: async (id: number, enabled: boolean) => {
        return UpdateModEnabledById(enabled, id).then(broadcastModsUpdate)
    },
    splitTexture: async (id: number) => {
        return SplitTexture(id).then(broadcastModsUpdate)
    },
    deleteTexture: async (id: number) => {
        return DeleteTextureById(id).then(broadcastModsUpdate)
    },
    enableTexture: async (id: number, enabled: boolean) => {
        return UpdateTextureEnabledById(id, enabled).then(broadcastModsUpdate)
    },
    disableAllMods: async (game: number) => {
        return UpdateDisableAllModsByGame(game).then(broadcastModsUpdate)
    },
    deleteCharacter: async (name: string, id: number, game: number) => {
        return DeleteCharacter(name, id, game).then(broadcastCharacterUpdate)
    },
    selectModById: async (id: number) => {
        return SelectModById(id)
    },
    selectClosestCharacter: async (name: string, game: number) => {
        return SelectClosestCharacter(name, game)
    },
    selectModsByCharacterName: async (name: string, game: number) => {
        return SelectModsByCharacterName(name, game)
    },
    selectCharacterWithModsTagsAndTextures: async (game: number, modFilter: string, characterFilter: string, tagFilter: string) => {
        return SelectCharacterWithModsTagsAndTextures(game, modFilter, characterFilter, tagFilter)
    },
    selectCharactersByGame: async (game: number) => {
        return SelectCharactersByGame(game)
    },
    updateModImages: async (id: number, images: string[]) => {
        return UpdateModImages(id, images).then(broadcastModsUpdate)
    },
    updateModGbId: async (modId: number, gbId: number) => {
        return UpdateModGbId(modId, gbId).then(broadcastModsUpdate)
    },
    renameMod: async (id: number, name: string) => {
        return RenameMod(id, name).then(broadcastModsUpdate)
    },
    renameTexture: async (id: number, name: string) => {
        return RenameTexture(id, name).then(broadcastModsUpdate)
    },
    createCustomCharacter: async (name: string, image: string, element: string | undefined, game: number) => {
        return CreateCustomCharacter(name, image, element ?? "", game).then(broadcastCharacterUpdate)
    },
    insertTag: async (modId: number, name: string) => {
        return InsertTag(name, modId).then(broadcastTagsUpdate)
    },
    insertTagForAllModsByCharacterIds: async (characterIds: number[], tagName: string, game: number) => {
        return InsertTagForAllModsByCharacterIds(characterIds, tagName, game).then(broadcastTagsUpdate)
    },
    selectModsByGbId: async (gbId: number) => {
        return SelectModsByGbId(gbId)
    },
    selectPlaylistWithModsAndTags: async (game: number) => {
        return SelectPlaylistWithModsAndTags(game)
    },
    createPlaylist: async (game: number, name: string) => {
        return CreatePlaylist(game, name).then(broadcastPlaylistUpdate)
    },
    enableMods: (ids: number[], game: number) => {
        return UpdateModsEnabledFromSlice(ids, game).then(broadcastModsUpdate)
    },
    deletePlaylistById: (id: number) => {
        return DeletePlaylistById(id).then(broadcastPlaylistUpdate)
    },
    updatePlaylistName: (id: number, name: string) => {
        return UpdatePlaylistName(id, name).then(broadcastPlaylistUpdate)
    },
    selectTagsByModId: (modId: number) => {
        return SelectTagsByModId(modId)
    },
    deleteTag: (modId: number, name: string) => {
        return DeleteTag(name, modId).then(broadcastTagsUpdate)
    }
}

export default DB