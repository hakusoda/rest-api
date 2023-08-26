import adapter from '@sveltejs/adapter-vercel';
import { vitePreprocess } from '@sveltejs/kit/vite';

/** @type {import('@sveltejs/kit').Config} */
export default {
	kit: {
		adapter: adapter({ runtime: 'edge' })
	},
	extensions: ['.svelte'],
	preprocess: vitePreprocess()
};