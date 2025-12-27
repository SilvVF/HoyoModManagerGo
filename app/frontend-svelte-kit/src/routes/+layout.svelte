<script lang="ts">
	import '../app.css';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
	import AppSidebar from '$lib/components/hmm/sidebar/AppSidebar.svelte';

	const queryClient = new QueryClient();

	let { children } = $props();
</script>

<QueryClientProvider client={queryClient}>
	<Sidebar.Provider>
		<AppSidebar />
		<main>
			<Sidebar.Trigger />
			<svelte:boundary>
				{#snippet pending()}
					<p>loading...</p>
				{/snippet}

				{@render children?.()}
			</svelte:boundary>
		</main>
	</Sidebar.Provider>
</QueryClientProvider>
