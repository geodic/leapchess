<script lang="ts">
	import Chessboard from '$lib/components/Chessboard.svelte';
</script>

<Chessboard />

<style lang="postcss">
	:global(.cg-wrap) {
		@apply !w-[75vh];
	}
</style>
