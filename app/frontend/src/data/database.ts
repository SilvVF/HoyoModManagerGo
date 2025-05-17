import { CreateCustomCharacter, CreatePlaylist, DeleteCharacter, DeleteModById, DeletePlaylistById, DeleteTextureById, InsertTag, InsertTagForAllModsByCharacterIds, RenameMod, RenameTexture, SelectCharactersByGame, SelectCharacterWithModsTagsAndTextures, SelectClosestCharacter, SelectModById, SelectModsByCharacterName, SelectModsByGbId, SelectPlaylistWithModsAndTags, UpdateDisableAllModsByGame, UpdateModEnabledById, UpdateModGbId, UpdateModImages, UpdateModsEnabledFromSlice, UpdatePlaylistName, UpdateTextureEnabledById } from "wailsjs/go/dbh/DbHelper";
import { SplitTexture } from "wailsjs/go/main/App";

const DB = {
    deleteMod: async (id: number) => {
        return DeleteModById(id)
    },
    enableMod: async (id: number, enabled: boolean) => {
        return UpdateModEnabledById(enabled, id)
    },
    splitTexture: async (id: number) => {
        return SplitTexture(id)
    },
    deleteTexture: async (id: number) => {
        return DeleteTextureById(id)
    },
    enableTexture: async (id: number, enabled: boolean) => {
        return UpdateTextureEnabledById(id, enabled)
    },
    disableAllMods: async (game: number) => {
        return UpdateDisableAllModsByGame(game)
    },
    deleteCharacter: async (name: string, id: number, game: number) => {
        return DeleteCharacter(name, id, game)
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
        return UpdateModImages(id, images)
    },
    updateModGbId: async (modId: number, gbId: number) => {
        return UpdateModGbId(modId, gbId)
    },
    renameMod: async (id: number, name: string) => {
        return RenameMod(id, name)
    },
    renameTexture: async (id: number, name: string) => {
        return RenameTexture(id, name)
    },
    createCustomCharacter: async (name: string, image: string, element: string | undefined, game: number) => {
        return CreateCustomCharacter(name, image, element ?? "", game)
    },
    insertTag: async (modId: number, name: string) => {
        return InsertTag(name, modId)
    },
    insertTagForAllModsByCharacterIds: async (characterIds: number[], tagName: string, game: number) => {
        return InsertTagForAllModsByCharacterIds(characterIds, tagName, game)
    },
    selectModsByGbId: async (gbId: number) => {
        return SelectModsByGbId(gbId)
    },
    selectPlaylistWithModsAndTags: async (game: number) => {
        return SelectPlaylistWithModsAndTags(game)
    },
    createPlaylist: async (game: number, name: string) => {
        return CreatePlaylist(game, name)
    },
    enableMods: (ids: number[], game: number) => {
        return UpdateModsEnabledFromSlice(ids, game)
    },
    deletePlaylistById: (id: number) => {
        return DeletePlaylistById(id)
    },
    updatePlaylistName: (id: number, name: string) => {
        return UpdatePlaylistName(id, name)
    }
}

export default DB