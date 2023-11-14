import { json } from '@sveltejs/kit';

import type { RequestHandler } from './$types';
export const GET = (() => json({
	name: 'hakumi-rest-api',
	version: '1.0.0'
})) satisfies RequestHandler;
