<script lang="ts">
	import { Button, Modal } from 'flowbite-svelte';
	import { Chessground } from 'svelte-chessground';
	import { Board } from '$lib/scripts/board.svelte';
	import type { PieceSymbol } from 'chess.js';
	import { Engine, GoCommand, UciCommand } from '$lib/scripts/uci.js';
	let promotionDialog = $state(false);
	let chessground: Chessground;
	let resolvePromote: (piece: PieceSymbol) => void = () => {};
	let board: Board | undefined = $state();
	function promote(): Promise<PieceSymbol> {
		promotionDialog = true;
		return new Promise((resolve) => {
			resolvePromote = (piece: PieceSymbol) => {
				promotionDialog = false;
				resolve(piece);
			};
		});
	}
	$effect(() => {
		let stockfish = new Worker('stockfish-16.js');
		let engine = new Engine(stockfish.postMessage.bind(stockfish));
		stockfish.onmessage = (msg) => {
			engine.information(msg.data);
		};
		let uciCommand = new UciCommand((data) => {
			console.log(data);
		});
		engine.execute(uciCommand).then(() => {
			engine.newGame();
		});
		board = new Board(
			chessground,
			promote,
			(move) => {
				console.log(move);
				engine.makeMove(move.lan);
				setTimeout(() => {
					let bestmove = '';
					let goCommand = new GoCommand(
						(data) => {
							if (data.data.bestmove) {
								bestmove = data.data.bestmove;
								console.log('got bestmove');
								// @ts-ignore
								board.move(data.data.bestmove);
							}
						},
						'depth',
						10
					);
					engine.execute(goCommand).then(() => {
						console.log('done');
						engine.makeMove(bestmove);
					});
				}, 2000);
			},
			{
				type: 'game',
				color: 'white',
				predictivePlay: true
			}
		);
	});
</script>

<div style="--chessboard-color: {board?.color || '#f0d9b5'}">
	<Chessground bind:this={chessground} />
	<Modal bind:open={promotionDialog} dismissable={false} size="xs" class="h-fit w-fit">
		<div>
			<Button color="light" outline class="!p-2" on:click={resolvePromote.bind(null, 'q')}>
				<svg xmlns="http://www.w3.org/2000/svg" width="45" height="45"
					><g
						fill="#fff"
						fill-rule="evenodd"
						stroke="#000"
						stroke-width="1.5"
						stroke-linecap="round"
						stroke-linejoin="round"
						><path
							d="M8 12a2 2 0 1 1-4 0 2 2 0 1 1 4 0zm16.5-4.5a2 2 0 1 1-4 0 2 2 0 1 1 4 0zM41 12a2 2 0 1 1-4 0 2 2 0 1 1 4 0zM16 8.5a2 2 0 1 1-4 0 2 2 0 1 1 4 0zM33 9a2 2 0 1 1-4 0 2 2 0 1 1 4 0z"
						/><path
							d="M9 26c8.5-1.5 21-1.5 27 0l2-12-7 11V11l-5.5 13.5-3-15-3 15-5.5-14V25L7 14l2 12z"
							stroke-linecap="butt"
						/><path
							d="M9 26c0 2 1.5 2 2.5 4 1 1.5 1 1 .5 3.5-1.5 1-1.5 2.5-1.5 2.5-1.5 1.5.5 2.5.5 2.5 6.5 1 16.5 1 23 0 0 0 1.5-1 0-2.5 0 0 .5-1.5-1-2.5-.5-2.5-.5-2 .5-3.5 1-2 2.5-2 2.5-4-8.5-1.5-18.5-1.5-27 0z"
							stroke-linecap="butt"
						/><path d="M11.5 30c3.5-1 18.5-1 22 0M12 33.5c6-1 15-1 21 0" fill="none" /></g
					></svg
				>
			</Button>
			<Button color="light" outline class="!p-2" on:click={resolvePromote.bind(null, 'r')}>
				<svg xmlns="http://www.w3.org/2000/svg" width="45" height="45"
					><g
						fill="#fff"
						fill-rule="evenodd"
						stroke="#000"
						stroke-width="1.5"
						stroke-linecap="round"
						stroke-linejoin="round"
						><path
							d="M9 39h27v-3H9v3zm3-3v-4h21v4H12zm-1-22V9h4v2h5V9h5v2h5V9h4v5"
							stroke-linecap="butt"
						/><path d="M34 14l-3 3H14l-3-3" /><path
							d="M31 17v12.5H14V17"
							stroke-linecap="butt"
							stroke-linejoin="miter"
						/><path d="M31 29.5l1.5 2.5h-20l1.5-2.5" /><path
							d="M11 14h23"
							fill="none"
							stroke-linejoin="miter"
						/></g
					></svg
				>
			</Button>
			<Button color="light" outline class="!p-2" on:click={resolvePromote.bind(null, 'b')}>
				<svg xmlns="http://www.w3.org/2000/svg" width="45" height="45"
					><g
						fill="none"
						fill-rule="evenodd"
						stroke="#000"
						stroke-width="1.5"
						stroke-linecap="round"
						stroke-linejoin="round"
						><g fill="#fff" stroke-linecap="butt"
							><path
								d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.46-13.5-1-3.39 1.46-10.11.03-13.5 1-1.354.49-2.323.47-3-.5 1.354-1.94 3-2 3-2z"
							/><path
								d="M15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2z"
							/><path d="M25 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 1 1 5 0z" /></g
						><path d="M17.5 26h10M15 30h15m-7.5-14.5v5M20 18h5" stroke-linejoin="miter" /></g
					></svg
				>
			</Button>
			<Button color="light" outline class="!p-2" on:click={resolvePromote.bind(null, 'n')}>
				<svg xmlns="http://www.w3.org/2000/svg" width="45" height="45"
					><g
						fill="none"
						fill-rule="evenodd"
						stroke="#000"
						stroke-width="1.5"
						stroke-linecap="round"
						stroke-linejoin="round"
						><path d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21" fill="#fff" /><path
							d="M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.82 4.34-5 4-1.042-.94 1.41-3.04 0-3-1 0 .19 1.23-1 2-1 0-4.003 1-4-4 0-2 6-12 6-12s1.89-1.9 2-3.5c-.73-.994-.5-2-.5-3 1-1 3 2.5 3 2.5h2s.78-1.992 2.5-3c1 0 1 3 1 3"
							fill="#fff"
						/><path
							d="M9.5 25.5a.5.5 0 1 1-1 0 .5.5 0 1 1 1 0zm5.433-9.75a.5 1.5 30 1 1-.866-.5.5 1.5 30 1 1 .866.5z"
							fill="#000"
						/></g
					></svg
				>
			</Button>
		</div>
	</Modal>
</div>

<style lang="postcss">
	:global(coords) {
		@apply font-bold;
	}
	:global(coords.files) {
		@apply !left-[4%];
	}
	:global(coords.ranks) {
		@apply !top-[-5%];
	}
	:global(cg-board) {
		background-color: var(--chessboard-color) !important ;
	}
</style>
