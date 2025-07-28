<script lang="ts">
	import '../app.css';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import AppSidebar from '$lib/components/hmm/sidebar/AppSidebar.svelte';

	let { children } = $props();
</script>

<Sidebar.Provider>
	<AppSidebar />
	<main>
		<Sidebar.Trigger />
		{@render children?.()}
	</main>
</Sidebar.Provider>
