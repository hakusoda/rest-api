import { sveltekit } from '@sveltejs/kit/vite';
import type { UserConfig } from 'vite';
export default {
	build: {
		target: 'esnext'
	},
	plugins: [sveltekit()],
	optimizeDeps: {
		include: ['@supabase/postgrest-js']
	}
} satisfies UserConfig;