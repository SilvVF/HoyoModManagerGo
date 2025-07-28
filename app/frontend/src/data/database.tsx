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
import { QueryKey, useQuery, UseQueryOptions } from "@tanstack/react-query";
import { DataApi } from "./dataapi";
import { data } from "react-router-dom";
import { types } from "wailsjs/go/models";

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

const Keys = {
  ModByIdKey: (id: number) => ["mod", { id: id }],
  ModByGameKey: (game: number) => ["mods", { game: game }],
  ModsKey: ["mods"],

  CharacterModTagTexturesKey: ["characterWithModsTagsTextures"],
  Character: ["character"],
  CharacterId: (id: number) => ["character", id],

  Tags: ["tags"],
  TagsByModId: (modId: number) => ["tags", { modId: modId }],
};

export const useMod = (modId: number, queryKey: QueryKey) =>
  useQuery({
    queryKey: [...Keys.ModByIdKey(modId), ...queryKey],
    queryFn: () => DB.selectModById(modId),
  });

export const useTagsForMod = (
  modId: number,
  options: UseQueryOptions<types.Tag[], Error, types.Tag[], readonly unknown[]>,
) =>
  useQuery({
    queryFn: async () => await DB.selectTagsByModId(modId),
    ...options,
    queryKey: [Keys.TagsByModId(modId), ...options.queryKey],
  });

export const useCharactersWithModsTagsAndTextures = (
  dataApi: DataApi,
  queryKey: QueryKey,
) =>
  useQuery({
    queryKey: [...Keys.CharacterModTagTexturesKey, ...queryKey],
    queryFn: dataApi.charactersWithModsAndTags,
  });

const DB = {
  characterKey: (id: number) => ["character", id],
  charactersGameKey: (game: number) => ["characters", { game }],
  charactersKey: () => ["characters"],

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
  enableMods: async (ids: number[], game: number) => {
    await UpdateModsEnabledFromSlice(ids, game);
    broadcastModsUpdate();
  },
  deletePlaylistById: async (id: number) => {
    await DeletePlaylistById(id);
    broadcastPlaylistUpdate();
  },
  updatePlaylistName: async (id: number, name: string) => {
    await UpdatePlaylistName(id, name);
    broadcastPlaylistUpdate();
  },
  selectTagsByModId: (modId: number) => {
    return SelectTagsByModId(modId);
  },
  deleteTag: async (modId: number, name: string) => {
    await DeleteTag(name, modId);
    return broadcastTagsUpdate();
  },
};

export default DB;
