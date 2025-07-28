<script lang="ts">
	import { types } from '@/lib/wailsjs/go/models';
	import { useResizeWidth } from './useResizeListener.svelte';
	import HoverableText from './HoverableText.svelte';
	import { Switch } from '../../ui/switch';
	import { Button } from '../../ui/button';
	import { ChevronDown } from '@lucide/svelte';
	import DB from '@/lib/data/database';
	import ModActionsDropdown from './ModActionsDropdown.svelte';

	let {
		mod,
		expanded = $bindable(false)
	}: {
		mod: types.ModWithTags;
		expanded: boolean;
	} = $props();

	const resizer = useResizeWidth(mod.mod.filename);
	function toggleExpanded() {
		expanded = !expanded;
	}

	function toggleEnabled() {
		DB.mutation.enableMod(mod.mod.id, !mod.mod.enabled);
	}
</script>

<div bind:this={resizer.row} class="flex w-full flex-row items-center">
	<div class="mr-1 w-fit flex-grow overflow-hidden">
		<HoverableText
			text={mod.mod.filename}
			tags={mod.tags.map((t) => t.name)}
			images={mod.mod.previewImages}
			width={resizer.width}
		/>
	</div>
	<div bind:this={resizer.actions} class="flex flex-row items-center">
		<Switch checked={mod.mod.enabled} onchange={toggleEnabled} class="space-x-2" />
		<ModActionsDropdown mod={mod.mod} />
		{#if mod.textures.length !== 0}
			<Button
				variant="ghost"
				size="icon"
				onclick={toggleExpanded}
				class={`${expanded ? 'rotate-180' : 'rotate-0'}`}
			>
				<ChevronDown />
			</Button>
		{/if}
	</div>
</div>
