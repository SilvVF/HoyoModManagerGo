import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import {
	GenshinApi,
	StarRailApi,
	WutheringWavesApi,
	ZenlessApi,
	type DataApi
} from '@/lib/data/dataapi';
import {
	genshinElementPref,
	honkaiElementPref,
	wuwaElementPref,
	zzzElementPref,
	type GoPref
} from '@/lib/data/prefs.svelte';

const gameIds = [1, 2, 3, 4];
const dataApis: { [n: number]: DataApi } = {
	1: GenshinApi,
	2: StarRailApi,
	3: ZenlessApi,
	4: WutheringWavesApi
};
const prefs: { [n: number]: GoPref<string[]> } = {
	1: genshinElementPref,
	2: honkaiElementPref,
	3: zzzElementPref,
	4: wuwaElementPref
};

export const load: PageLoad = async ({ params }) => {
	try {
		const gameId = Number(params.slug);

		if (!gameIds.includes(gameId)) {
			error(404, 'Not found');
		}

		const dataApi = dataApis[gameId];

		return {
			dataApi: dataApi,
			elementPref: prefs[gameId],
			characters: await dataApi.charactersWithModsAndTags(),
			elements: await dataApi.elements(),
			game: await dataApi.game(),
			skinId: await dataApi.skinId()
		};
	} catch {
		error(500, 'couldnt handle route');
	}
};
