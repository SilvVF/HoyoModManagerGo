<script lang="ts">
	import { HoverCard, HoverCardContent, HoverCardTrigger } from '../../ui/hover-card';
	import TextDisplay from './TextDisplay.svelte';

	let {
		images,
		text,
		width,
		tags
	}: { images: string[]; tags: string[]; text: string; width: number } = $props();
</script>

<HoverCard>
	<HoverCardTrigger>
		<TextDisplay {text} availableSpace={width} />
	</HoverCardTrigger>
	<HoverCardContent class="flex h-96 w-80 flex-col overflow-y-clip">
		<div>Tags: {tags.join(', ')}</div>
		<div>{text}</div>
		<div class="flex h-full flex-row justify-between space-x-4 overflow-x-auto">
			{#each images as uri}
				<img class="w-70 h-70 m-2 aspect-square rounded-none object-cover" src={uri} alt={''} />
			{/each}
		</div>
	</HoverCardContent>
</HoverCard>
