import { Chessground } from 'svelte-chessground';
import type { PieceSymbol, Color as ColorJS, Move as MoveJS } from 'chess.js';
import { Chess, SQUARES } from 'chess.js';
import type { Dests, Key, PiecesDiff, Role, Color as ColorCG } from 'chessground/types';

type Concat<T extends string[]> = T extends [infer F extends string, ...infer R extends string[]]
	? `${F}${Concat<R>}`
	: '';

type BoardState =
	| 'unknown'
	| 'opponentMove'
	| 'pendingMove'
	| 'pendingIdeaMove'
	| 'pendingPredictionMove';
type Colors = 'white' | 'black';
type OptionalMoveJS = {
	[Property in keyof MoveJS]?: MoveJS[Property];
};
interface Move {
	move?: MoveJS;
	idea?: MoveJS;
	predictions: MoveJS[];
	children: History;
}
interface CompleteMove {
	move: MoveJS;
	idea?: MoveJS;
	predictions: MoveJS[];
	children: History;
}
interface PseudoMove {
	children: History;
}
interface History {
	[id: number]: Move;
}
interface GameConfig {
	type: 'game';
	color: Colors;
	predictivePlay: boolean;
}
interface AnalysisConfig {
	type: 'analysis';
}
type Config = GameConfig | AnalysisConfig;
interface FullConfig {
	type: 'game' | 'analysis';
	color: Colors | 'both';
	predictivePlay: boolean;
}

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

function convertTurn(turn: ColorCG): ColorJS;
function convertTurn(turn: ColorJS): ColorCG;
function convertTurn(turn: ColorJS | ColorCG): ColorJS | ColorCG {
	if (turn === 'w' || turn === 'b') {
		return turn === 'w' ? 'white' : 'black';
	}
	return turn === 'white' ? 'w' : 'b';
}
function invertTurn(turn: ColorCG): ColorCG;
function invertTurn(turn: ColorJS): ColorJS;
function invertTurn(turn: ColorJS | ColorCG): ColorJS | ColorCG {
	if (turn === 'w' || turn === 'b') {
		return turn === 'w' ? 'b' : 'w';
	}
	return turn === 'white' ? 'black' : 'white';
}

export class Board {
	chessground: Chessground;
	promote: () => Promise<PieceSymbol>;
	history: PseudoMove = {
		children: []
	};
	currentLine: number[] = [];
	chess: Chess;
	previousState: BoardState = 'unknown';
	state: BoardState = 'unknown';
	callback: (move: MoveJS) => any;
	config: FullConfig;
	color: string = $state('#f0d9b5');
	constructor(
		chessground: Chessground,
		promote: () => Promise<PieceSymbol>,
		callback: (move: MoveJS) => any,
		config: Config
	) {
		this.chessground = chessground;
		this.promote = promote;
		this.callback = callback;
		this.config = { color: 'both', predictivePlay: false, ...config };
		this.state = 'pendingMove';
		console.log(this.config);
		this.chess = new Chess();
		this.chessground.set({
			check: false,
			movable: {
				free: false,
				color: 'white',
				dests: this.dests(),
				events: {
					after: this.handleMove.bind(this)
				}
			},
			highlight: {
				check: true,
				lastMove: true
			}
		});
	}
	get stateProgression(): Concat<[BoardState, ' ', BoardState]> {
		return `${this.previousState} ${this.state}`;
	}
	move(move: string): void;
	move(move: { orig: Key; dest: Key; promotion?: PieceSymbol }): void;
	move(move: { orig: Key; dest: Key; promotion?: PieceSymbol } | string): void {
		let movejs;
		if (typeof move === 'string') {
			movejs = this.chess.move(move);
			this.chessground.move(movejs.from, movejs.to);
		} else {
			movejs = this.chess.move({ from: move.orig, to: move.dest, promotion: move.promotion });
			this.chessground.move(move.orig, move.dest);
		}
		this.update(movejs);
	}
	getMove(): Move {
		return this.currentLine.reduce((acc, id) => acc.children[id], this.history) as Move;
	}
	getCompleteMove() {
		return this.currentLine.reduce(
			(acc, id) => ('move' in (acc.children[id] || {}) ? acc.children[id] : acc),
			this.history
		) as CompleteMove;
	}
	createNewMove(): Move {
		const id = Date.now();
		let currentMove = this.getMove();
		currentMove.children[id] = { predictions: [], children: [] };
		this.currentLine.push(id);
		return currentMove.children[id];
	}
	resolveNextState(state: BoardState): BoardState {
		let predictivePlay = this.config.predictivePlay;
		console.log(this.previousState);
		switch (state) {
			case 'opponentMove':
				return predictivePlay ? 'pendingIdeaMove' : 'pendingMove';
			case 'pendingMove':
				return predictivePlay && this.previousState == 'pendingIdeaMove'
					? 'pendingPredictionMove'
					: 'opponentMove';
			case 'pendingIdeaMove':
				return 'pendingMove';
			case 'pendingPredictionMove':
				return 'opponentMove';
			default:
				return 'unknown';
		}
	}
	async update(move: MoveJS) {
		let currentMove = this.getMove();
		let turn = convertTurn(invertTurn(move.color));
		let color = this.config.color;
		let nextState = this.resolveNextState(this.state);
		switch (this.stateProgression) {
			case 'unknown pendingMove':
				this.createNewMove();
				currentMove = this.getMove();
				console.log(this.history);
				break;
			default:
		}
		switch (this.state) {
			case 'opponentMove':
				this.createNewMove();
				currentMove = this.getMove();
				currentMove.move = move;
				break;
			case 'pendingMove':
				currentMove.move = move;
				break;
			case 'pendingIdeaMove':
				this.createNewMove();
				currentMove = this.getMove();
				currentMove.idea = move;
				await delay(700);
				let completeMove = this.getCompleteMove();
				let fen = completeMove.move.after;
				this.chessground.set({ fen });
				this.chess.load(fen);
				this.chessground.set({ lastMove: [completeMove.move.from, completeMove.move.to] });
				break;
			case 'pendingPredictionMove':
				currentMove.predictions.push(move);
				break;
			default:
				console.error('Invalid state: ' + this.state);
		}
		this.previousState = this.state;
		this.state = nextState;
		switch (this.state) {
			case 'opponentMove':
				this.color = '#f0d9b5';
				if (currentMove.move) {
					this.callback(currentMove.move);
				}
				break;
			case 'pendingMove':
				this.color = '#f0d9b5';
				break;
			case 'pendingIdeaMove':
				this.color = '#a3f79c';
				let fen = this.chess.fen();
				let splitFen = fen.split(' ');
				splitFen[1] = invertTurn(splitFen[1] as ColorJS);
				this.chess.load(splitFen.join(' '));
				turn = invertTurn(turn);
				color = turn;
				break;
			case 'pendingPredictionMove':
				this.color = '#efb3b3';
				color = turn;
				break;
			default:
				break;
		}
		switch (this.stateProgression) {
			case 'pendingPredictionMove opponentMove':
				await delay(700);
				let completeMove = this.getCompleteMove();
				let fen = completeMove.move.after;
				this.chessground.set({ fen });
				this.chess.load(fen);
				this.chessground.set({ lastMove: [completeMove.move.from, completeMove.move.to] });
			default:
		}
		this.chessground.set({
			check: this.chess.isCheck(),
			turnColor: turn,
			movable: {
				free: false,
				color: color,
				dests: this.dests()
			}
		});
	}
	dests(): Dests {
		const dests = new Map();
		SQUARES.forEach((s) => {
			const ms = this.chess.moves({ square: s, verbose: true });
			if (ms.length)
				dests.set(
					s,
					ms.map((m) => m.to)
				);
		});
		return dests;
	}
	async handleMove(orig: Key, dest: Key): Promise<MoveJS> {
		let move: MoveJS;
		let turn = convertTurn(this.chess.turn());
		try {
			move = this.chess.move({ from: orig, to: dest });
		} catch (e) {
			console.error(e);
			let piece = await this.promote();
			let cgPieceName: Role;
			switch (piece) {
				case 'r':
					cgPieceName = 'rook';
					break;
				case 'n':
					cgPieceName = 'knight';
					break;
				case 'b':
					cgPieceName = 'bishop';
					break;
				case 'q':
					cgPieceName = 'queen';
					break;
				default:
					throw new Error('Unknown piece');
			}
			let diff: PiecesDiff = new Map();
			diff.set(dest, {
				role: cgPieceName,
				color: turn
			});
			this.chessground.setPieces(diff);
			move = this.chess.move({ from: orig, to: dest, promotion: piece });
		}
		this.update(move);
		return move;
	}
}
