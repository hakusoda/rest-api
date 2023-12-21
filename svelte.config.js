import adapter from '@sveltejs/adapter-vercel';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
export default {
	kit: {
		csrf: { checkOrigin: false },
		adapter: adapter({ runtime: 'edge' })
	},
	extensions: ['.svelte'],
	preprocess: vitePreprocess()
};