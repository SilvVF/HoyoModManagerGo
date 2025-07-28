export function useResizeWidth(text: string) {
	let row = $state<HTMLDivElement | undefined>();
	let actions = $state<HTMLDivElement | undefined>();
	let width = $state(0);

	$effect(() => {
		text;
		row;
		actions;

		if (!row) {
			width = 0;
			return;
		}

		let frameId: number | undefined = undefined;
		const listener = () => {
			if (frameId !== undefined) cancelAnimationFrame(frameId);

			frameId = requestAnimationFrame(() => {
				const rowWidth = row?.clientWidth ?? 0;
				const controlsWidth = actions?.clientWidth ?? 0;
				width = rowWidth - controlsWidth;
			});
		};

		window.addEventListener('resize', listener);
		listener();

		return () => {
			if (frameId !== undefined) cancelAnimationFrame(frameId);
			window.removeEventListener('resize', listener);
		};
	});

	return {
		get width() {
			return width;
		},
		get row() {
			return row;
		},
		set row(value) {
			row = value;
		},
		get actions() {
			return actions;
		},
		set actions(value) {
			actions = value;
		}
	};
}
