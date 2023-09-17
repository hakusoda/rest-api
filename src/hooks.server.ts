import { jwtVerify } from 'jose';
import type { Handle } from '@sveltejs/kit';

import { dev } from '$app/environment';
import { error } from '$lib/response';
import { JWT_SECRET } from '$lib/constants';
import { KV_REST_API_URL, KV_REST_API_TOKEN, KV_REST_API_READ_ONLY_TOKEN } from '$env/static/private';
if (dev) {
	process.env.KV_REST_API_URL = KV_REST_API_URL;
	process.env.KV_REST_API_TOKEN = KV_REST_API_TOKEN;
	process.env.KV_REST_API_READ_ONLY_TOKEN = KV_REST_API_READ_ONLY_TOKEN;
}

const COOKIE_NAME = 'auth-token';
export const handle = (async ({ event, resolve }) => {
	const allowOrigin = event.request.headers.get('origin')!;
	if (event.request.method === 'OPTIONS')
		return new Response(null, {
			headers: {
				'Access-Control-Allow-Origin': allowOrigin,
				'Access-Control-Allow-Headers': 'content-type',
				'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
				'Access-Control-Allow-Credentials': 'true'
			}
		});

	event.locals.getSession = async (required: boolean = true) => {
		const cookie = event.cookies.get(COOKIE_NAME) || event.request.headers.get('authorization');
		if (!cookie) {
			if (required)
				throw error(401, 'unauthorised');
			return Promise.resolve(null);
		}

		const response = await jwtVerify(cookie, JWT_SECRET);
		return response.payload as any;
	};
	
	const response = await resolve(event, {
		filterSerializedResponseHeaders: name => name === 'content-range'
	});
	response.headers.append('Access-Control-Allow-Origin', allowOrigin);
	response.headers.append('Access-Control-Allow-Credentials', 'true');

	return response;
}) satisfies Handle;