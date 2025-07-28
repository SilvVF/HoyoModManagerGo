<script lang="ts">
	import { cn } from 'tailwind-variants';

	let {
		text,
		availableSpace,
		baseVelocity = 50 // pixels per sec
	}: {
		text: string;
		availableSpace: number;
		baseVelocity?: number;
	} = $props();

	let textRef = $state<HTMLSpanElement | undefined>();

	const overflowing = $derived((textRef?.scrollWidth ?? 0) > availableSpace);

	const travelDistance = $derived(textRef?.scrollWidth ?? 0);
	const animationDuration = $derived(overflowing ? Math.max(travelDistance / baseVelocity, 1) : 0);
</script>

<div class={`overflow-hidden whitespace-nowrap`} style="max-width: {availableSpace}px;">
	<div
		class={overflowing ? 'animate-marquee' : ''}
		style={overflowing ? `animation-duration: ${animationDuration}s;` : ''}
	>
		<span bind:this={textRef} class="inline-block text-sm"> {text}</span>
		{#if overflowing}
			<span class="inline-block px-4 text-sm"> {text}</span>
		{/if}
	</div>
</div>

<style>
	.animate-marquee {
		display: inline-block;
		animation: marquee linear infinite;
	}
	@keyframes marquee {
		0% {
			transform: translateX(0%);
		}
		100% {
			transform: translateX(-50%);
		}
	}
</style>
