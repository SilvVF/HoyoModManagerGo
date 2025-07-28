import { EventsOn, LogError } from '$lib/wailsjs/runtime/runtime';
import DB, { DBEvent, type DBEventData, type DBKey } from './database';

export function useDbUpdateListener<T>(
	key: DBKey[],
	initial: T,
	callback: (queries: (typeof DB)['query']) => Promise<T>
) {
	let data = $state(initial);

	$effect(() => {
		let done = false;
		const runCallbackCatching = () => {
			try {
				callback(DB.query).then((value) => {
					if (!done) {
						data = value;
					}
				});
			} catch (e) {
				LogError(`${e}`);
			}
		};

		runCallbackCatching();

		const cancel = EventsOn(DBEvent, (keys: DBEventData) => {
			if (keys.find((k) => key.includes(k))) {
				runCallbackCatching();
			}
		});

		return () => {
			done = true;
			cancel();
		};
	});

	return data;
}

export function useDbUpdateListenerMultiple<T>(
	key: DBKey[],
	callback: (queries: (typeof DB)['query']) => Promise<T[]>
) {
	const data = $state<T[]>([]);

	$effect(() => {
		let done = false;
		const runCallbackCatching = () => {
			try {
				callback(DB.query).then((value) => {
					if (!done) {
						data.length = 0;
						data.push(...value);
					}
				});
			} catch (e) {
				LogError(`${e}`);
			}
		};

		runCallbackCatching();

		const runOnAll = key.includes('all');

		const cancel = EventsOn(DBEvent, (keys: DBEventData) => {
			if (runOnAll || keys.find((k) => key.includes(k))) {
				runCallbackCatching();
			}
		});

		return () => {
			done = true;
			cancel();
		};
	});

	return data;
}
