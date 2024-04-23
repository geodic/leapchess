import { UciCommand } from './uci';
import { GoCommand } from './go';
import { IsReadyCommand } from './isready';
import type { Command } from './common';
import type { output } from './parsing';

export { UciCommand, GoCommand, IsReadyCommand };
export enum PositionType {
	fen = 0,
	startpos = 1
}
export class Engine {
	sendCommand: (cmd: string) => any;
	command?: Command;
	commandResolve: () => void = () => {};
	protected position: {
		type: PositionType;
		moves: string[];
	} = { type: PositionType.startpos, moves: [] };
	constructor(sendCommand: (cmd: string) => any) {
		this.sendCommand = sendCommand;
	}
	async information(msg: output) {
		if (this.command === undefined) throw new Error();
		let completed = await this.command.process(msg);
		console.log(completed);
		if (completed) {
			this.command = undefined;
			this.commandResolve();
		}
	}
	protected runRawCommand(cmd: string, check = true): void {
		if (check && this.command) throw new Error();
		this.sendCommand(cmd);
	}
	protected updatePosition(): void {
		console.log(this.position);
		this.runRawCommand(
			`position ${this.position.type == PositionType.fen ? 'fen' : 'startpos'} moves ${this.position.moves.join(' ')}`
		);
	}
	setPosition(type?: PositionType, moves?: string[]): void {
		this.position.type = type || this.position.type;
		this.position.moves = moves || this.position.moves;
		this.updatePosition();
	}
	makeMove(moves: string | string[]): void {
		if (Array.isArray(moves)) {
			this.position.moves.concat(moves);
		} else {
			this.position.moves.push(moves);
		}
		this.updatePosition();
	}
	newGame(): void {
		this.runRawCommand('ucinewgame');
		this.setPosition(PositionType.startpos, []);
	}
	execute(command: Command): Promise<void> {
		if (this.command) throw new Error();
		this.command = command;
		let commandString = command.getCommandString();
		this.sendCommand(commandString);
		return new Promise((resolve) => {
			this.commandResolve = resolve;
		});
	}
	stop() {
		this.sendCommand('stop');
	}
}
