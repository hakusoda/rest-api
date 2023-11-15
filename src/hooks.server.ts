import base64 from '@hexagon/base64';
import { jwtVerify } from 'jose';
import type { Handle } from '@sveltejs/kit';

import { dev } from '$app/environment';
import { error } from '$lib/response';
import { JWT_SECRET } from '$lib/constants';
import { ApiFeatureFlag } from '$lib/enums';
import type { UserSessionJWT } from '$lib/types';
import { throwIfFeatureNotEnabled } from '$lib/util';
import { EDGE_CONFIG, KV_REST_API_URL, KV_REST_API_TOKEN, KV_REST_API_READ_ONLY_TOKEN } from '$env/static/private';
if (dev) {
	process.env.EDGE_CONFIG = EDGE_CONFIG;
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
				'Access-Control-Allow-Headers': 'content-type, something',
				'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
				'Access-Control-Allow-Credentials': 'true'
			}
		});

	const { pathname } = event.url;
	if (pathname.startsWith('/v1/auth/sign-in'))
		await throwIfFeatureNotEnabled(ApiFeatureFlag.SignIn);
	else if (pathname.startsWith('/v1/auth/sign-up'))
		await throwIfFeatureNotEnabled(ApiFeatureFlag.SignUp);
	else if (pathname.startsWith('/v1/auth/callback'))
		await throwIfFeatureNotEnabled(ApiFeatureFlag.ThirdPartySignUp);
	else if (pathname.startsWith('/v1/auth/device'))
		await throwIfFeatureNotEnabled(ApiFeatureFlag.SecurityKeys);

	event.locals.getSession = async (required: boolean = true, verifyDevice = true) => {
		const cookie = event.cookies.get(COOKIE_NAME) || event.request.headers.get('authorization');
		if (!cookie) {
			if (required)
				throw error(401, 'unauthorised');
			return null as any;
		}

		const response = await jwtVerify(cookie, JWT_SECRET);
		const payload = response.payload as any as UserSessionJWT;
		if (verifyDevice) {
			const [encodedSignature, encodedBody] = event.request.headers.get('something')?.split(':') ?? [];
			if (!encodedSignature || !encodedBody)
				throw error(401, 'missing_signature');

			const deviceKey = payload.device_public_key;
			if (!deviceKey)
				throw error(401, 'missing_device_key');
			if (deviceKey === 'mellow') // this is temporary
				return payload;

			const key = await crypto.subtle.importKey('raw', base64.toArrayBuffer(deviceKey), {
				name: 'ECDSA',
				namedCurve: 'P-384',
			}, false, ['verify']).catch(err => {
				console.error(err);
				throw error(401, 'missing_device_key');
			});

			const signature = base64.toArrayBuffer(encodedSignature, false);
			const body = base64.toArrayBuffer(encodedBody, false);
			if (!await crypto.subtle.verify({
				name: 'ECDSA',
				hash: { name: 'SHA-384' }
			}, key, signature, body))
				throw error(401, 'invalid_signature');
		}

		return payload;
	};
	
	const response = await resolve(event, {
		filterSerializedResponseHeaders: name => name === 'content-range'
	});
	response.headers.append('Access-Control-Allow-Origin', allowOrigin);
	response.headers.append('Access-Control-Allow-Credentials', 'true');

	return response;
}) satisfies Handle;