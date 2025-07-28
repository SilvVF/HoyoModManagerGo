<script lang="ts">
	import { Checkbox } from '$lib/components/ui/checkbox/index.js';
	import { useDbUpdateListenerMultiple } from '$lib/data/useDbUpdateListener.svelte';
	import DB from '@/lib/data/database';
	import type { PageProps } from './$types';
	import CharacterInfoCard from '@/lib/components/hmm/character-info-card/CharacterInfoCard.svelte';
	import { cn } from '@/lib/utils';

	let { data }: PageProps = $props();

	const characters = useDbUpdateListenerMultiple(['all'], () => data.charactersWithModsAndTags());
	const grid = $state(true);

	function toggleMod(modId: number, enabled: boolean) {
		DB.mutation.enableMod(modId, enabled);
	}
</script>

<div
	class={cn(
		grid ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'columns-1 sm:columns-2 lg:columns-3',
		'mx-2 mb-16 gap-4 space-y-4'
	)}
>
	{#each characters as character}
		<CharacterInfoCard {character}></CharacterInfoCard>
	{/each}
</div>
