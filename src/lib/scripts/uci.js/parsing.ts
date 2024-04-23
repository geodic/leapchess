type BasicPrimitives = string | number | boolean;
type Primitives = BasicPrimitives | BasicPrimitives[] | Record<string | number, BasicPrimitives>;
export type output = `${keyof Types}${string}`;

function parsePrimitive(value: string): Primitives {
	try {
		return JSON.parse(value);
	} catch (e) {
		return value;
	}
}

let types = {
	id: {
		removeFirst: true,
		ending: false,
		types: {
			name: String,
			author: String
		}
	},
	option: {
		removeFirst: true,
		ending: false,
		types: {
			name: String,
			type: String,
			default: parsePrimitive,
			min: parseInt,
			max: parseInt
		}
	},
	uciok: {
		removeFirst: false,
		ending: true,
		types: {
			uciok: () => true
		}
	},
	info: {
		removeFirst: true,
		ending: false,
		types: {
			depth: parseInt,
			seldepth: parseInt,
			cpuload: parseInt,
			multipv: parseInt,
			score: (str: string) => {
				let parts = str.split(' ');
				return {
					stage: parts[0],
					value: parseInt(parts[1]),
					type: parts[2] || 'regular'
				};
			},
			time: parseInt,
			nodes: parseInt,
			nps: parseInt,
			tbhits: parseInt,
			hashfull: parseInt,
			pv: (str: string) => str.split(' '),
			currmove: String,
			currmovenumber: parseInt,
			refutation: String, // TODO
			currline: String, // NOTE: This is probably not the right way to do this
			string: String // I am pretty sure this is specific to the WASM version of stockfish
		}
	},
	bestmove: {
		removeFirst: false,
		ending: true,
		types: {
			bestmove: String,
			ponder: String
		}
	},
	readyok: {
		removeFirst: false,
		ending: true,
		types: {
			readyok: () => true
		}
	}
};
type Types = {
	[type in keyof typeof types]: {
		[key in keyof (typeof types)[type]['types']]: (typeof types)[type]['types'][key] extends (
			...args: any[]
		) => any
			? ReturnType<(typeof types)[type]['types'][key]>
			: any;
	};
};
let typedTypes: {
	[type in keyof typeof types]: {
		types: {
			[key in keyof (typeof types)[type]['types']]: (...args: any[]) => any;
		};
		removeFirst: boolean;
		ending: boolean;
	};
} = types;
export function parse<T extends keyof Types>(
	line: `${T}${string}`
): { data: Types[T] & { commandType: T }; done: boolean } {
	let type: T = line.split(' ')[0] as T;
	let spec = typedTypes[type];
	let processedLine: string;
	if (spec.removeFirst) {
		processedLine = line.slice(type.length + 1);
	} else {
		processedLine = line;
	}
	let pattern = `(?=(?:^| )(?:${Object.keys(spec.types).join('|')}))`;
	let parts = processedLine
		.split(new RegExp(pattern))
		.map((x) =>
			x
				.trim()
				.split(/(?<=^[a-z]+ )/)
				.map((x) => x?.trim())
		)
		.map((x) =>
			x.length == 2
				? [x[0], spec.types[x[0] as keyof typeof spec.types](x[1])]
				: [x[0], spec.types[x[0] as keyof typeof spec.types]('')]
		);
	return {
		data: Object.assign({}, { commandType: type }, Object.fromEntries(parts)),
		done: spec.ending
	};
}
