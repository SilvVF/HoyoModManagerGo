<script lang="ts">
	import CharacterInfoCard from '@/lib/components/hmm/character-info-card/CharacterInfoCard.svelte';
	import { Button } from '@/lib/components/ui/button';
	import { Input } from '@/lib/components/ui/input';
	import type { DataApi } from '@/lib/data/dataapi';
	import { createPrefState, modsAvailablePref, type GoPref } from '@/lib/data/prefs.svelte';
	import { createDbQuery, createDbQueryList } from '@/lib/data/useDbUpdateListener.svelte';
	import { cn } from '@/lib/utils';
	import type { types } from '@/lib/wailsjs/go/models';

	let {
		characters,
		pref,
		elements,
		dataApi
	}: {
		dataApi: DataApi;
		elements: string[];
		characters: types.CharacterWithModsAndTags[];
		pref: GoPref<string[]>;
	} = $props();

	const elementPref = createPrefState([], pref);
	let availableOnly = $state(true);

	let grid = $state(true);
	let query = $state('');
	let customOnly = $state(false);

	const charactersList = createDbQueryList(['mods', 'characters', 'tags'], characters, () =>
		dataApi.charactersWithModsAndTags()
	);

	const filteredCharacters = $derived(
		charactersList
			.filter(
				(cwmt) =>
					elementPref.value
						.map((v) => v.toLowerCase())
						.includes(cwmt.characters.element.toLowerCase()) || elementPref.value.length === 0
			)
			.filter((cwmt) => (availableOnly ? !(cwmt.modWithTags.length === 0) : true))
			.filter((cwmt) => (customOnly ? cwmt.characters.custom : true))
			.filter(
				(cwmt) =>
					query.length === 0 ||
					cwmt.characters.name.toLowerCase().includes(query.toLowerCase()) ||
					cwmt.modWithTags.find(
						(mt) =>
							mt.mod.filename.toLowerCase().includes(query.toLowerCase()) ||
							mt.tags.find((t) => t.name.toLowerCase().includes(query.toLowerCase())) !== undefined
					) !== undefined
			)
	);

	const filteredElements = $derived(
		elements.map((element) => ({
			selected: elementPref.value.includes(element),
			name: element
		}))
	);

	function toggleElement(element: string) {
		const set = new Set(elementPref.value);
		if (set.has(element)) {
			set.delete(element);
		} else {
			set.add(element);
		}
		elementPref.value = Array.from(set);
	}
</script>

<div class="flex flex-col">
	<div>async value: {y}</div>
	<div>async value: {key} {initial}</div>
	<Input bind:value={query} />
	<div class="flex flex-row">
		{#each filteredElements as { name, selected }}
			<Button variant={selected ? 'default' : 'outline'} onclick={() => toggleElement(name)}>
				{name}
			</Button>
		{/each}
	</div>
	<div>Element Pref {elementPref.value}</div>
	<div
		class={cn(
			grid
				? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
				: 'columns-1 sm:columns-2 lg:columns-3',
			'mx-2 mb-16 gap-4 space-y-4'
		)}
	>
		{#each filteredCharacters as character (`${character.characters.id}_${character.characters.game}`)}
			<CharacterInfoCard {character}></CharacterInfoCard>
		{/each}
	</div>
</div>
