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
import { queryClient } from "./queryClient";

const broadcastModsUpdate = () => {
  queryClient.invalidateQueries({ queryKey: ["mods"] });
  queryClient.invalidateQueries({
    queryKey: ["characterWithModsTagsTextures"],
  });
};

const broadcastTagsUpdate = () => {
  queryClient.invalidateQueries({ queryKey: ["tags"] });
  queryClient.invalidateQueries({ queryKey: ["mods"] });
  queryClient.invalidateQueries({
    queryKey: ["characterWithModsTagsTextures"],
  });
};

const broadcastCharacterUpdate = () => {
  queryClient.invalidateQueries({ queryKey: ["characters"] });
  queryClient.invalidateQueries({
    queryKey: ["characterWithModsTagsTextures"],
  });
};

const broadcastPlaylistUpdate = () => {
  queryClient.invalidateQueries({ queryKey: ["playlist"] });
};

//const broadcastMultiUpdate = (keys: DBKey[]) => EventsEmit(DBEvent, keys)
const DB = {
  characterKey: (id: number) => ["character", id],
  charactersGameKey: (game: number) => ["characters", { game }],
  charactersKey: () => ["characters"],

  modKey: (id: number) => ["mod", id],
  modsGameKey: (game: number) => ["mods", { game }],
  modsKey: () => ["mods"],
  modsByCharacterKey: (characterName: string, game: number) => [
    "mods",
    { characterName, game },
  ],
  modsByGbIdKey: (gbId: number) => ["mods", { gbId }],
  characterWithModsTagsTexturesKey: (
    game: number,
    modFilter: string,
    characterFilter: string,
    tagFilter: string,
  ) => [
    "characterWithModsTagsTextures",
    { game, modFilter, characterFilter, tagFilter },
  ],
  characterModsTagsTexturesKey: () => ["characterWithModsTagsTextures"],

  tagsKey: () => ["tags"],
  tagsByModKey: (modId: number) => ["tags", { modId }],

  playlistKey: (game: number) => ["playlist", { game }],

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
    return InsertTagForAllModsByCharacterIds(characterIds, tagName, game).then(
      broadcastTagsUpdate,
    );
  },
  selectModsByGbId: async (gbId: number) => {
    return SelectModsByGbId(gbId);
  },
  selectPlaylistWithModsAndTags: async (game: number) => {
    return SelectPlaylistWithModsAndTags(game);
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
  selectTagsByModId: (modId: number) => {
    return SelectTagsByModId(modId);
  },
  deleteTag: (modId: number, name: string) => {
    return DeleteTag(name, modId).then(broadcastTagsUpdate);
  },
};

export default DB;
