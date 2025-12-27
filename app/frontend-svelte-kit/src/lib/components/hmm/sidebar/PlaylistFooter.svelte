<script lang="ts">
	import { ListMusic, RefreshCwIcon } from '@lucide/svelte';
	import { Button } from '../../ui/button';
	import { SidebarFooter, SidebarGroupLabel, useSidebar } from '../../ui/sidebar';
	import { Card } from '../../ui/card';
	import { createDbQueryList, createDbQueryListt } from '@/lib/data/useDbUpdateListener.svelte';
	import DB from '@/lib/data/database';

	const sidebar = useSidebar();

	const playlists = createDbQueryListt(['playlist'], () => DB.query.selectPlaylists());
</script>

{#if sidebar.open}
	<SidebarFooter>
		<div class="flex w-full flex-row items-baseline justify-between">
			<SidebarGroupLabel>Playlists</SidebarGroupLabel>
			<Button onclick={() => {}} size={'icon'} variant={'ghost'}>
				<RefreshCwIcon />
			</Button>
		</div>
		<Card class="max-h-[calc(30vh)] overflow-x-clip overflow-y-auto py-2">
			<div class="flex flex-col space-y-1 p-2">
				{#each playlists as playlist}
					<div class="flex flex-row">
						<Button
							variant="ghost"
							class="w-full max-w-3/4 justify-start overflow-clip font-normal"
							onclick={() => {}}
						>
							<ListMusic />
							{playlist.name}
						</Button>
					</div>
				{/each}
			</div>
		</Card>
	</SidebarFooter>
{/if}
