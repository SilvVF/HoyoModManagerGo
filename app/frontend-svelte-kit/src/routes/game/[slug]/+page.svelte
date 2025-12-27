<script lang="ts">
	import type { PageProps } from './$types';
	import { page } from '$app/state';
	import GameScreen from './GameScreen.svelte';

	let { data }: PageProps = $props();
</script>

{#key page.url.pathname}
	<GameScreen
		characters={data.characters}
		dataApi={data.dataApi}
		elements={data.elements}
		pref={data.elementPref}
	/>
{/key}
