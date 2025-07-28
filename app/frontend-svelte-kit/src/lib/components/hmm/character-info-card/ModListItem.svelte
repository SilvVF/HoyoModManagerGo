<script lang="ts">
	import type { types } from '@/lib/wailsjs/go/models';
	import ModDislplay from './ModDislplay.svelte';
	import TextureDisplay from './TextureDisplay.svelte';

	let { mod }: { mod: types.ModWithTags } = $props();
	let expanded = $state(false);
</script>

<div class="flex w-full flex-col">
	<ModDislplay {mod} bind:expanded />

	{#if expanded}
		{#each mod.textures as texture}
			<TextureDisplay {texture} />
		{/each}
	{/if}
</div>
