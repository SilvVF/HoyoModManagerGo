<script lang="ts">
	import { EllipsisVertical, Trash, PencilIcon, CheckCheckIcon } from '@lucide/svelte';
	import { Dialog, DialogTrigger } from '../../ui/dialog';
	import {
		DropdownMenuTrigger,
		DropdownMenuContent,
		DropdownMenuItem,
		DropdownMenuShortcut,
		DropdownMenu
	} from '../../ui/dropdown-menu';
	import { Button } from '../../ui/button';
	import type { types } from '@/lib/wailsjs/go/models';
	import NameDialogContent from '../name-dialog/NameDialogContent.svelte';

	let {
		playlist,
		rename,
		deletePlaylist,
		enablePlaylist
	}: {
		playlist: types.Playlist;
		rename: (name: string) => void;
		deletePlaylist: () => void;
		enablePlaylist: () => void;
	} = $props();
</script>

<Dialog>
	<NameDialogContent
		title="rename playlist"
		description={`renames the playlist from ${playlist.name} to provided value`}
		onSuccess={rename}
	/>
	<DropdownMenu>
		<DropdownMenuTrigger>
			<Button class="col-span-1" variant={'ghost'} size="icon">
				<EllipsisVertical />
			</Button>
		</DropdownMenuTrigger>
		<DropdownMenuContent>
			<DropdownMenuItem onclick={() => deletePlaylist()}>
				<Trash class="mr-2 h-4 w-4" />
				<span class="w-full">Delete</span>
				<DropdownMenuShortcut>⇧d</DropdownMenuShortcut>
			</DropdownMenuItem>
			<DialogTrigger>
				<DropdownMenuItem>
					<PencilIcon class="mr-2 h-4 w-4" />
					<span class="w-full">Rename</span>
					<DropdownMenuShortcut>⇧r</DropdownMenuShortcut>
				</DropdownMenuItem>
			</DialogTrigger>
			<DropdownMenuItem onclick={() => enablePlaylist()}>
				<CheckCheckIcon class="mr-2 h-4 w-4" />
				<span class="w-full">Toggle</span>
				<DropdownMenuShortcut>⇧t</DropdownMenuShortcut>
			</DropdownMenuItem>
		</DropdownMenuContent>
	</DropdownMenu>
</Dialog>
