import {
	CreateCustomCharacter,
	CreatePlaylist,
	DeleteCharacter,
	DeleteModById,
	DeletePlaylistById,
	DeleteTag,
	DeleteTextureById,
	EnablePlaylist,
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
	SelectPlaylists,
	SelectPlaylistWithModsAndTags,
	SelectTagsByModId,
	UpdateDisableAllModsByGame,
	UpdateModEnabledById,
	UpdateModGbId,
	UpdateModImages,
	UpdateModsEnabledFromSlice,
	UpdatePlaylistName,
	UpdateTextureEnabledById
} from '../wailsjs/go/dbh/DbHelper';
import { SplitTexture } from '../wailsjs/go/main/App';
import { EventsEmit } from '../wailsjs/runtime/runtime';

export type DBKey = 'characters' | 'mods' | 'tags' | 'playlist' | 'all';

export const DBEvent = 'DB_EVENT';
export type DBEventData = DBKey[];

const broadcastCharacterUpdate = () => EventsEmit(DBEvent, ['characters']);
const broadcastModsUpdate = () => EventsEmit(DBEvent, ['mods']);
const broadcastTagsUpdate = () => EventsEmit(DBEvent, ['tags']);
const broadcastPlaylistUpdate = () => EventsEmit(DBEvent, ['playlist']);

//const broadcastMultiUpdate = (keys: DBKey[]) => EventsEmit(DBEvent, keys)
const DB = {
	mutation: {
		enablePlaylist: async (id: number, game: number) => {
			return EnablePlaylist(id, game).then(broadcastModsUpdate);
		},
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
		insertTag: async (modId: number, name: string) => {
			return InsertTag(name, modId).then(broadcastTagsUpdate);
		},
		insertTagForAllModsByCharacterIds: async (
			characterIds: number[],
			tagName: string,
			game: number
		) => {
			return InsertTagForAllModsByCharacterIds(characterIds, tagName, game).then(
				broadcastTagsUpdate
			);
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
		createCustomCharacter: async (
			name: string,
			image: string,
			element: string | undefined,
			game: number
		) => {
			return CreateCustomCharacter(name, image, element ?? '', game).then(broadcastCharacterUpdate);
		}
	},
	query: {
		selectTagsByModId: (modId: number) => {
			return SelectTagsByModId(modId);
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
			tagFilter: string
		) => {
			return SelectCharacterWithModsTagsAndTextures(game, modFilter, characterFilter, tagFilter);
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
		selectPlaylists: async () => {
			return SelectPlaylists();
		}
	}
};

export default DB;
