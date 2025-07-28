import { types } from '../wailsjs/go/models';
import * as GApi from '../wailsjs/go/api/genshinApi';
import * as SRApi from '../wailsjs/go/api/starRailApi';
import * as WuWaApi from '../wailsjs/go/api/wutheringWavesApi';
import * as ZZZApi from '../wailsjs/go/api/zenlessZoneZeroApi';
import DB from './database';

export interface DataApi {
	game(): Promise<number>;
	skinId(): Promise<number>;
	characters(): Promise<types.Character[]>;
	charactersWithModsAndTags(): Promise<types.CharacterWithModsAndTags[]>;
	elements(): Promise<string[]>;
}

export const NoOpApi: DataApi = {
	game: async () => -1,
	skinId: async () => -1,
	characters: async () => [],
	charactersWithModsAndTags: async () => [],
	elements: async () => []
};

export const GenshinApi: DataApi = {
	game: GApi.GetGame,
	skinId: GApi.SkinId,
	characters: async () => DB.query.selectCharactersByGame(await GApi.GetGame()),
	charactersWithModsAndTags: async () =>
		DB.query.selectCharacterWithModsTagsAndTextures(await GApi.GetGame(), '', '', ''),
	elements: GApi.Elements
};

export const StarRailApi: DataApi = {
	game: SRApi.GetGame,
	skinId: SRApi.SkinId,
	characters: async () => DB.query.selectCharactersByGame(await SRApi.GetGame()),
	charactersWithModsAndTags: async () =>
		DB.query.selectCharacterWithModsTagsAndTextures(await SRApi.GetGame(), '', '', ''),
	elements: SRApi.Elements
};

export const ZenlessApi: DataApi = {
	game: ZZZApi.GetGame,
	skinId: ZZZApi.SkinId,
	characters: async () => DB.query.selectCharactersByGame(await ZZZApi.GetGame()),
	charactersWithModsAndTags: async () =>
		DB.query.selectCharacterWithModsTagsAndTextures(await ZZZApi.GetGame(), '', '', ''),
	elements: ZZZApi.Elements
};

export const WutheringWavesApi: DataApi = {
	game: WuWaApi.GetGame,
	skinId: WuWaApi.SkinId,
	characters: async () => DB.query.selectCharactersByGame(await WuWaApi.GetGame()),
	charactersWithModsAndTags: async () =>
		DB.query.selectCharacterWithModsTagsAndTextures(await WuWaApi.GetGame(), '', '', ''),
	elements: WuWaApi.Elements
};
