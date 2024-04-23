import { parse } from './parsing';
export type Command = HandlerCommand | SubscribeCommand;

class _Command {
	getCommandString(): string {
		return '';
	}
	_process = parse;
}
export class SubscribeCommand extends _Command {
	subscriber: (data: { data: ReturnType<typeof parse>['data'] | null; done: boolean }) => any =
		() => {};
	constructor(subscriber: SubscribeCommand['subscriber']) {
		super();
		this.subscriber = subscriber;
	}
	async process(...args: Parameters<_Command['_process']>): Promise<boolean> {
		let { data, done } = await this._process(...args);
		this.subscriber({ data: Object.keys(data).length > 0 ? data : null, done });
		return done;
	}
}
export class HandlerCommand extends _Command {
	protected clumpedData: ReturnType<typeof parse>['data'][] = [];
	handler: (data: typeof this.clumpedData) => any = () => {};
	constructor(handler: HandlerCommand['handler']) {
		super();
		this.handler = handler;
	}
	async process(...args: Parameters<_Command['_process']>): Promise<boolean> {
		if (args[0].length === 0) {
			return false;
		}
		let { data, done } = await this._process(...args);
		if (Object.keys(data).length > 0) {
			this.clumpedData.push(data);
		}
		if (done) {
			this.handler(this.clumpedData);
		}
		return done;
	}
}
