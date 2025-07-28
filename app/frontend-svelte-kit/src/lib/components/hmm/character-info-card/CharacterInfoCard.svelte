<script lang="ts">
	import { types } from '@/lib/wailsjs/go/models';
	import { Card } from '../../ui/card';
	import { type ComponentProps } from 'svelte';
	import { cn, type WithElementRef } from '@/lib/utils';
	import type { HTMLAttributes } from 'svelte/elements';
	import ModListItem from './ModListItem.svelte';

	let {
		character,
		class: className
	}: { character: types.CharacterWithModsAndTags } & HTMLAttributes<HTMLDivElement> = $props();
</script>

<Card class={cn('', className)}>
	<div class="flex flex-row">
		<div class="flex w-1/3 flex-col items-center">
			<img
				src={character.characters.avatarUrl}
				alt=""
				class="aspect-square w-full rounded-md object-cover"
			/>
			<b class="w-full truncate p-2 text-center text-lg">{character.characters.name}</b>
		</div>
		<div class="max-h-[300px] w-full overflow-hidden overflow-y-auto">
			{#each character.modWithTags as mod}
				<ModListItem {mod} />
			{/each}
		</div>
	</div>
</Card>
