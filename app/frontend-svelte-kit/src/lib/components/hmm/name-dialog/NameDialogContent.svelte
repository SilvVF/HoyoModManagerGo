<script lang="ts">
	import {
		DialogClose,
		DialogContent,
		DialogDescription,
		DialogFooter,
		DialogHeader,
		DialogTitle
	} from '../../ui/dialog';
	import Input from '../../ui/input/input.svelte';

	let props: {
		title: string;
		description: string;
		onSuccess: (text: string) => void;
	} = $props();

	let input = $state('');
</script>

<DialogContent class="sm:max-w-md">
	<DialogHeader>
		<DialogTitle>{props.title}</DialogTitle>
		<DialogDescription>{props.description}</DialogDescription>
	</DialogHeader>
	<div class="flex items-center space-x-2">
		<div class="grid flex-1 gap-2">
			<Input bind:value={input} defaultValue="" />
		</div>
	</div>
	<DialogFooter class="sm:justify-start">
		<DialogClose type="button">Cancel</DialogClose>
		<DialogClose onclick={() => props.onSuccess(input)}>Confirm</DialogClose>
	</DialogFooter>
</DialogContent>
