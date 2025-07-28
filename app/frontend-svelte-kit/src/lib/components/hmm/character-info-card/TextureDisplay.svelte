<script lang="ts">
	import { types } from '@/lib/wailsjs/go/models';
	import { Switch } from '../../ui/switch';
	import HoverableText from './HoverableText.svelte';
	import DB from '@/lib/data/database';
	import { useResizeWidth } from './useResizeListener.svelte';

	let { texture }: { texture: types.Texture } = $props();

	const resizer = useResizeWidth(texture.filename);

	function toggleEnabled() {
		DB.mutation.enableTexture(texture.id, !texture.enabled);
	}
</script>

<div bind:this={resizer.row} class="flex w-full flex-row items-center">
	<div class="mr-1 flex-grow overflow-hidden">
		<HoverableText
			text={texture.filename}
			tags={[]}
			images={texture.previewImages}
			width={resizer.width}
		/>
	</div>
	<div bind:this={resizer.actions} class="flex flex-row items-center">
		<Switch
			checked={texture.enabled}
			onchange={() => toggleEnabled()}
			class="flex w-fit items-center space-x-2"
		/>
	</div>
</div>
