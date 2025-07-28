<script lang="ts">
	import { goto } from '$app/navigation';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import { page } from '$app/state';
	import {
		SparkleIcon,
		TrainIcon,
		GlobeIcon,
		WavesIcon,
		SettingsIcon,
		SearchIcon
	} from '@lucide/svelte';
	import PlaylistFooter from './PlaylistFooter.svelte';

	const LibraryRoutes = {
		Genshin: {
			id: 1,
			path: '/game/1',
			display: 'Genshin Impact',
			icon: SparkleIcon
		},
		StarRail: {
			id: 2,
			path: '/game/2',
			display: 'Honkai Star Rail',
			icon: TrainIcon
		},
		ZZZ: {
			id: 3,
			path: '/game/3',
			display: 'Zenless Zone Zero',
			icon: GlobeIcon
		},
		WuWa: {
			id: 4,
			path: '/game/4',
			display: 'Wuthering Waves',
			icon: WavesIcon
		}
	} as const;

	const ApplicationRoutes = {
		Settings: {
			display: 'Settings',
			path: '/settings',
			icon: SettingsIcon
		},
		Search: {
			display: 'Search',
			path: '/search',
			icon: SearchIcon
		}
	} as const;
</script>

<Sidebar.Root collapsible={'icon'}>
	<Sidebar.Header />
	<Sidebar.Content>
		<Sidebar.Group />
		<Sidebar.SidebarGroupLabel>Application</Sidebar.SidebarGroupLabel>
		<Sidebar.SidebarGroupContent>
			<Sidebar.SidebarMenu>
				{#each Object.values(ApplicationRoutes) as item}
					<Sidebar.SidebarMenuItem>
						<Sidebar.SidebarMenuButton
							variant={page.url.pathname === item.path ? 'outline' : 'default'}
							class="w-full"
							onclick={() => goto(item.path)}
						>
							<item.icon />
							<a href={item.path}>
								<span>{item.display}</span>
							</a>
						</Sidebar.SidebarMenuButton>
					</Sidebar.SidebarMenuItem>
				{/each}
			</Sidebar.SidebarMenu>
		</Sidebar.SidebarGroupContent>
		<Sidebar.Group />

		<Sidebar.Group />
		<Sidebar.SidebarGroupLabel>Library</Sidebar.SidebarGroupLabel>
		<Sidebar.SidebarGroupContent>
			<Sidebar.SidebarMenu>
				{#each Object.values(LibraryRoutes) as item}
					<Sidebar.SidebarMenuItem>
						<Sidebar.SidebarMenuButton
							variant={page.url.pathname === item.path ? 'outline' : 'default'}
							class="w-full"
							onclick={() => goto(item.path)}
						>
							<item.icon />
							<a href={item.path}>
								<span>{item.display}</span>
							</a>
						</Sidebar.SidebarMenuButton>
					</Sidebar.SidebarMenuItem>
				{/each}
			</Sidebar.SidebarMenu>
		</Sidebar.SidebarGroupContent>
		<Sidebar.Group />
	</Sidebar.Content>
	<PlaylistFooter />
</Sidebar.Root>
