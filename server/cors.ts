import type { RequestHandler } from 'express';
import type { HandleFunction } from 'connect';

const handler: RequestHandler = (req, res, next) => {
	res.setHeader('Access-Control-Allow-Origin', '*');
	res.setHeader('Access-Control-Allow-Methods', 'GET');
	res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
	res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
	next();
};
export default handler as RequestHandler & HandleFunction;
