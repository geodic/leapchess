import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import cors from './server/cors';
import type { Plugin } from 'vite';

const viteServerConfig: Plugin = {
	name: 'add-headers',
	configureServer: (server) => {
		server.middlewares.use(cors);
	}
};

export default defineConfig({
	plugins: [viteServerConfig, sveltekit()]
});
