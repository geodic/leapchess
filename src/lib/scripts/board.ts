import { Chessground } from 'svelte-chessground';
import type { PieceSymbol, Color as ColorJS, Move as MoveJS } from 'chess.js';
import { Chess, SQUARES } from 'chess.js';
import type { Dests, Key, PiecesDiff, Role, Color as ColorCG } from 'chessground/types';
import type { Config as ConfigCG } from 'chessground/config';

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
interface Move extends OptionalMoveJS {
	idea?: MoveJS;
	predictions: MoveJS[];
	children: History;
}
interface CompleteMove extends MoveJS {
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
	config: FullConfig;
	constructor(chessground: Chessground, promote: () => Promise<PieceSymbol>, config: Config) {
		this.chessground = chessground;
		this.promote = promote;
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
	move(orig: Key, dest: Key, promotion?: PieceSymbol) {
		this.chessground.move(orig, dest);
		let move = this.chess.move({ from: orig, to: dest, promotion });
		this.update(move);
	}
	getMove(): Move {
		return this.currentLine.reduce((acc, id) => acc.children[id], this.history) as Move;
	}
	getCompleteMove() {
		return this.currentLine.reduce(
			(acc, id) => ('san' in (acc.children[id] || {}) ? acc.children[id] : acc),
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
				Object.assign(currentMove, move);
				break;
			case 'pendingMove':
				Object.assign(currentMove, move);
				break;
			case 'pendingIdeaMove':
				this.createNewMove();
				currentMove = this.getMove();
				currentMove.idea = move;
				await delay(700);
				let completeMove = this.getCompleteMove();
				let fen = completeMove.after;
				this.chessground.set({ fen });
				this.chess.load(fen);
				this.chessground.set({ lastMove: [completeMove.from, completeMove.to] });
				break;
			case 'pendingPredictionMove':
				currentMove.predictions.push(move);
				this.createNewMove();
				break;
			default:
				console.error('Invalid state: ' + this.state);
		}
		this.previousState = this.state;
		this.state = nextState;
		switch (this.state) {
			case 'pendingIdeaMove':
				let fen = this.chess.fen();
				let splitFen = fen.split(' ');
				splitFen[1] = invertTurn(splitFen[1] as ColorJS);
				this.chess.load(splitFen.join(' '));
				turn = invertTurn(turn);
				color = turn;
				break;
			case 'pendingPredictionMove':
				color = turn;
			default:
				break;
		}
		switch (this.stateProgression) {
			case 'pendingPredictionMove opponentMove':
				await delay(700);
				let completeMove = this.getCompleteMove();
				let fen = completeMove.after;
				this.chessground.set({ fen });
				this.chess.load(fen);
				if (currentMove.from && currentMove.to) {
					this.chessground.set({ lastMove: [currentMove.from, currentMove.to] });
				}
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
