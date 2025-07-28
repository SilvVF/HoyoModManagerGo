<script lang="ts">
	import {
		EllipsisVertical,
		Trash,
		PencilIcon,
		ViewIcon,
		CheckCheckIcon,
		TagIcon,
		EditIcon
	} from '@lucide/svelte';
	import {
		DropdownMenu,
		DropdownMenuContent,
		DropdownMenuItem,
		DropdownMenuShortcut,
		DropdownMenuTrigger
	} from '../../ui/dropdown-menu';
	import { Button } from '../../ui/button';
	import DB from '@/lib/data/database';
	import { types } from '@/lib/wailsjs/go/models';

	let {
		mod
	}: {
		mod: types.Mod;
	} = $props();

	function onDelete() {
		DB.mutation.deleteMod(mod.id);
	}

	function onRename() {}

	function onView() {}

	function onEnable() {
		DB.mutation.enableMod(mod.id, !mod.enabled);
	}

	function addTag() {}

	function onKeymapEdit() {}
</script>

<DropdownMenu>
	<DropdownMenuTrigger>
		{#snippet child({ props })}
			<Button {...props} class="col-span-1" variant={'ghost'} size="icon">
				<EllipsisVertical />
			</Button>
		{/snippet}
	</DropdownMenuTrigger>
	<DropdownMenuContent>
		<DropdownMenuItem onclick={onDelete}>
			<Trash class="mr-2 h-4 w-4" />
			<span class="w-full">Delete</span>
			<DropdownMenuShortcut>⇧d</DropdownMenuShortcut>
		</DropdownMenuItem>
		<DropdownMenuItem class="min-w-full">
			<div class="flex flex-row">
				<PencilIcon class="mr-2 h-4 w-4" />
				<div class="flex w-full flex-row items-center justify-end">
					<span class="w-full">Rename</span>
					<DropdownMenuShortcut class="">⇧r</DropdownMenuShortcut>
				</div>
			</div>
		</DropdownMenuItem>
		<DropdownMenuItem onclick={onView}>
			<ViewIcon class="mr-2 h-4 w-4" />
			<span class="w-full">View</span>
			<DropdownMenuShortcut>⇧v</DropdownMenuShortcut>
		</DropdownMenuItem>
		<DropdownMenuItem onclick={onEnable}>
			<CheckCheckIcon class="mr-2 h-4 w-4" />
			<span class="w-full">Toggle</span>
			<DropdownMenuShortcut>⇧t</DropdownMenuShortcut>
		</DropdownMenuItem>
		<DropdownMenuItem onclick={addTag}>
			<TagIcon class="mr-2 h-4 w-4" />
			<span class="w-full">Add Tag</span>
			<DropdownMenuShortcut>⇧a</DropdownMenuShortcut>
		</DropdownMenuItem>
		{#if onKeymapEdit}
			<DropdownMenuItem onclick={onKeymapEdit}>
				<EditIcon class="mr-2 h-4 w-4" />
				<span class="w-full">Edit</span>
				<DropdownMenuShortcut>⇧e</DropdownMenuShortcut>
			</DropdownMenuItem>
		{/if}
	</DropdownMenuContent>
</DropdownMenu>
