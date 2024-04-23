import express from 'express';
//@ts-ignore
import { handler } from '../build/handler.js';
import cors from './cors.js';

const app = express();
const port = 80;

app.use(cors);
app.use(handler);

app.listen(port, () => {
	console.log(`Listening on ${port}`);
});
