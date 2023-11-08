import { json } from '@sveltejs/kit';

import type { RequestHandler } from './$types';
export const GET = (() => json({
	name: 'voxelified-api',
	version: '1.4.0'
})) satisfies RequestHandler;
