import { CancelFn } from "@/lib/tsutils";
import { useStateProducer } from "@/lib/utils";
import { useEffect } from "react";
import {
  CreateCustomCharacter,
  CreatePlaylist,
  DeleteCharacter,
  DeleteModById,
  DeletePlaylistById,
  DeleteTag,
  DeleteTextureById,
  InsertTag,
  InsertTagForAllModsByCharacterIds,
  RenameMod,
  RenameTexture,
  SelectCharactersByGame,
  SelectCharacterWithModsTagsAndTextures,
  SelectClosestCharacter,
  SelectModById,
  SelectModsByCharacterName,
  SelectModsByGbId,
  SelectPlaylistWithModsAndTags,
  SelectTagsByModId,
  UpdateDisableAllModsByGame,
  UpdateModEnabledById,
  UpdateModGbId,
  UpdateModImages,
  UpdateModsEnabledFromSlice,
  UpdatePlaylistName,
  UpdateTextureEnabledById,
} from "wailsjs/go/dbh/DbHelper";
import { SplitTexture } from "wailsjs/go/main/App";
import { EventsEmit, EventsOn, LogDebug } from "wailsjs/runtime/runtime";

type DBKey = "characters" | "mods" | "tags" | "playlist" | "all";

const DBEvent = "DB_EVENT";
type DBEventData = DBKey[];

export class DBEventListener {
  #listeners = new Set<{ keys: Set<string>; cb: () => void }>();

  subscribe(keys: DBKey[], callback: () => void): CancelFn {
    LogDebug("subscribing to item: " + keys + "items: " + this.#listeners.size);
    const item = {
      keys: new Set(keys),
      cb: callback,
    };

    this.#listeners.add(item);

    return () => this.#listeners.delete(item);
  }

  #keysHasChanged(keys: Set<string>, changed: DBEventData): boolean {
    if (keys.has("all")) return true;
    for (const change of changed) {
      if (keys.has(change)) return true;
    }
    return false;
  }

  start(): CancelFn {
    const cancel = EventsOn(DBEvent, (changed: DBEventData) => {
      for (const { keys, cb } of this.#listeners) {
        if (this.#keysHasChanged(keys, changed)) {
          try {
            cb();
          } catch (e) {
            LogDebug(`failed to run callback for item ${keys}`);
          }
        }
      }
    });

    return cancel;
  }
}

const dbEventListener = new DBEventListener();

export const useDbEventListener = () => {
  useEffect(() => {
    const cancel = dbEventListener.start();
    return () => cancel();
  }, []);
};

export function useDbQuery<T>(
  queryFn: () => Promise<T>,
  dependencies: DBKey[],
  queryKeys: ReadonlyArray<unknown> = [],
  enabled: boolean = true,
) {
  const data = useStateProducer<{
    data: T | undefined;
    loading: boolean;
    error: Error | null;
  }>(
    { data: undefined, loading: true, error: null },
    async (update, onDispose) => {
      if (!enabled) return;

      const updateData = async () => {
        update((prev) => ({
          ...prev,
          loading: true,
        }));

        try {
          const data = await queryFn();
          update({
            data: data,
            loading: false,
            error: null,
          });
        } catch (e) {
          const err = e instanceof Error ? e : new Error("Unknown error");
          update((prev) => ({
            ...prev,
            loading: false,
            error: err,
          }));
        }
      };

      await updateData();

      const cancel = dbEventListener.subscribe(dependencies, updateData);

      onDispose(() => cancel());
    },
    [dependencies, queryKeys, enabled],
  );

  return {
    data: data.data,
    isLoading: data.loading,
    error: data.error,
    hasLoaded: data.data !== undefined,
  };
}

export const useDbUpdateListener = (key: DBKey[], callback: () => void) => {
  useEffect(() => {
    const cancel = dbEventListener.subscribe(key, callback);
    return () => cancel();
  }, [...key, callback]);
};

const broadcastCharacterUpdate = () => EventsEmit(DBEvent, ["characters"]);
const broadcastModsUpdate = () => EventsEmit(DBEvent, ["mods"]);
const broadcastTagsUpdate = () => EventsEmit(DBEvent, ["tags"]);
const broadcastPlaylistUpdate = () => EventsEmit(DBEvent, ["playlist"]);

const DB = {
  queries: {
    selectModById: async (id: number) => {
      return SelectModById(id);
    },
    selectClosestCharacter: async (name: string, game: number) => {
      return SelectClosestCharacter(name, game);
    },
    selectModsByCharacterName: async (name: string, game: number) => {
      return SelectModsByCharacterName(name, game);
    },
    selectCharacterWithModsTagsAndTextures: async (
      game: number,
      modFilter: string,
      characterFilter: string,
      tagFilter: string,
    ) => {
      return SelectCharacterWithModsTagsAndTextures(
        game,
        modFilter,
        characterFilter,
        tagFilter,
      );
    },
    selectCharactersByGame: async (game: number) => {
      return SelectCharactersByGame(game);
    },
    selectModsByGbId: async (gbId: number) => {
      return SelectModsByGbId(gbId);
    },
    selectPlaylistWithModsAndTags: async (game: number) => {
      return SelectPlaylistWithModsAndTags(game);
    },
    selectTagsByModId: (modId: number) => {
      return SelectTagsByModId(modId);
    },
  },

  mutations: {
    deleteMod: async (id: number) => {
      return DeleteModById(id).then(broadcastModsUpdate);
    },
    enableMod: async (id: number, enabled: boolean) => {
      return UpdateModEnabledById(enabled, id).then(broadcastModsUpdate);
    },
    splitTexture: async (id: number) => {
      return SplitTexture(id).then(broadcastModsUpdate);
    },
    deleteTexture: async (id: number) => {
      return DeleteTextureById(id).then(broadcastModsUpdate);
    },
    enableTexture: async (id: number, enabled: boolean) => {
      return UpdateTextureEnabledById(id, enabled).then(broadcastModsUpdate);
    },
    disableAllMods: async (game: number) => {
      return UpdateDisableAllModsByGame(game).then(broadcastModsUpdate);
    },
    deleteCharacter: async (name: string, id: number, game: number) => {
      return DeleteCharacter(name, id, game).then(broadcastCharacterUpdate);
    },
    updateModImages: async (id: number, images: string[]) => {
      return UpdateModImages(id, images).then(broadcastModsUpdate);
    },
    updateModGbId: async (modId: number, gbId: number) => {
      return UpdateModGbId(modId, gbId).then(broadcastModsUpdate);
    },
    renameMod: async (id: number, name: string) => {
      return RenameMod(id, name).then(broadcastModsUpdate);
    },
    renameTexture: async (id: number, name: string) => {
      return RenameTexture(id, name).then(broadcastModsUpdate);
    },
    createCustomCharacter: async (
      name: string,
      image: string,
      element: string | undefined,
      game: number,
    ) => {
      return CreateCustomCharacter(name, image, element ?? "", game).then(
        broadcastCharacterUpdate,
      );
    },
    insertTag: async (modId: number, name: string) => {
      return InsertTag(name, modId).then(broadcastTagsUpdate);
    },
    insertTagForAllModsByCharacterIds: async (
      characterIds: number[],
      tagName: string,
      game: number,
    ) => {
      return InsertTagForAllModsByCharacterIds(
        characterIds,
        tagName,
        game,
      ).then(broadcastTagsUpdate);
    },
    createPlaylist: async (game: number, name: string) => {
      return CreatePlaylist(game, name).then(broadcastPlaylistUpdate);
    },
    enableMods: (ids: number[], game: number) => {
      return UpdateModsEnabledFromSlice(ids, game).then(broadcastModsUpdate);
    },
    deletePlaylistById: (id: number) => {
      return DeletePlaylistById(id).then(broadcastPlaylistUpdate);
    },
    updatePlaylistName: (id: number, name: string) => {
      return UpdatePlaylistName(id, name).then(broadcastPlaylistUpdate);
    },
    deleteTag: (modId: number, name: string) => {
      return DeleteTag(name, modId).then(broadcastTagsUpdate);
    },
  },
};

export default DB;
