import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import {
	GenshinApi,
	StarRailApi,
	WutheringWavesApi,
	ZenlessApi,
	type DataApi
} from '@/lib/data/dataapi';

const gameIds = [1, 2, 3, 4];
const dataApis: { [n: number]: DataApi } = {
	1: GenshinApi,
	2: StarRailApi,
	3: ZenlessApi,
	4: WutheringWavesApi
};

export const load: PageLoad = ({ params }) => {
	const gameId = Number(params.slug);

	if (!gameIds.includes(gameId)) {
		error(404, 'Not found');
	}

	const dataApi = dataApis[gameId];

	return dataApi;
};
