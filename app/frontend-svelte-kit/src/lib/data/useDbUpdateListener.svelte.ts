import { EventsOn, LogDebug, LogError } from '$lib/wailsjs/runtime/runtime';
import { onDestroy, onMount } from 'svelte';
import DB, { DBEvent, type DBEventData, type DBKey } from './database';
import type ArrowUp_0_1 from '@lucide/svelte/icons/arrow-up-0-1';

export const dbUpdateListener = (key: DBKey[], callback: () => void) => {
	const cancel = EventsOn(DBEvent, (keys: DBEventData) => {
		if (keys.includes('all') || keys.find((k) => key.includes(k))) {
			try {
				callback();
			} catch (e) {
				LogError(`${e}`);
			}
		}
	});

	return cancel;
};

export function createDbQuery<T>(
	key: DBKey[],
	initial: T,
	callback: (queries: (typeof DB)['query']) => Promise<T>
) {
	let data = $state(initial);
	const runOnAll = $derived(key.includes('all'));

	const cancel = EventsOn(DBEvent, (keys: DBEventData) => {
		if (runOnAll || keys.find((k) => key.includes(k))) {
			LogDebug('running db event callback key: ' + key + ' keys: ' + keys);
			callback(DB.query).then((value) => (data = value));
		}
	});

	onDestroy(cancel);

	return {
		get data() {
			return data;
		}
	};
}

export function createDbQueryListt<T>(
	key: DBKey[],
	callback: (queries: (typeof DB)['query']) => Promise<T[]>
) {
	let data = $state<T[]>([]);
	const runOnAll = $derived(key.includes('all'));

	onMount(() => {
		callback(DB.query).then((value) => {
			data.length = 0;
			data.push(...value);
		});
	});

	const cancel = EventsOn(DBEvent, (keys: DBEventData) => {
		if (runOnAll || keys.find((k) => key.includes(k))) {
			LogDebug('running db event callback key: ' + key + ' keys: ' + keys);

			callback(DB.query).then((value) => {
				data.length = 0;
				data.push(...value);
			});
		}
	});

	onDestroy(cancel);

	return data;
}

export function createDbQueryList<T>(
	key: DBKey[],
	initial: T[],
	callback: (queries: (typeof DB)['query']) => Promise<T[]>
) {
	let data = $state<T[]>(initial);
	const runOnAll = $derived(key.includes('all'));

	const cancel = EventsOn(DBEvent, (keys: DBEventData) => {
		if (runOnAll || keys.find((k) => key.includes(k))) {
			LogDebug('running db event callback key: ' + key + ' keys: ' + keys);

			callback(DB.query).then((value) => {
				data.length = 0;
				data.push(...value);
			});
		}
	});

	onDestroy(cancel);

	return data;
}
