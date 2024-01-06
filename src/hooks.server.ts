import base64 from '@hexagon/base64';
import { jwtVerify } from 'jose';
import type { Handle } from '@sveltejs/kit';

import { dev } from '$app/environment';
import { error } from '$lib/response';
import { ApiFeatureFlag } from '$lib/enums';
import type { UserSessionJWT } from '$lib/types';
import { throwIfFeatureNotEnabled } from '$lib/util';
import supabase, { handleResponse } from '$lib/supabase';
import { JWT_SECRET, getMellowServerApiEncryptionKey } from '$lib/constants';
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
	if (pathname.startsWith('/v0/auth/sign-in'))
		await throwIfFeatureNotEnabled(ApiFeatureFlag.SignIn);
	else if (pathname.startsWith('/v0/auth/sign-up'))
		await throwIfFeatureNotEnabled(ApiFeatureFlag.SignUp);
	else if (pathname.startsWith('/v0/auth/callback'))
		await throwIfFeatureNotEnabled(ApiFeatureFlag.ThirdPartySignUp);
	else if (pathname.startsWith('/v0/auth/device'))
		await throwIfFeatureNotEnabled(ApiFeatureFlag.SecurityKeys);

	event.locals.getSession = async (required: boolean = true) => {
		const cookie = event.cookies.get(COOKIE_NAME) || event.request.headers.get('authorization');
		if (!cookie) {
			if (required)
				throw error(401, 'unauthorised');
			return null as any;
		}

		const { payload } = await jwtVerify<UserSessionJWT>(cookie, JWT_SECRET);
		if (pathname.startsWith('/v0/auth/callback/') || ((payload.source_connection_id || (payload.mellow_user_state && payload.exp)) && pathname.startsWith('/v0/auth/device')))
			return payload;
		
		const [encodedSignature, encodedBody] = event.request.headers.get('something')?.split(':') ?? [];
		if (!encodedSignature || !encodedBody)
			throw error(401, 'missing_signature');

		const deviceKey = payload.device_public_key;
		if (!deviceKey)
			throw error(401, 'missing_device_key');

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

		return payload;
	};
	event.locals.getMellowServer = async () => {
		const keyHeader = event.request.headers.get('x-api-key');
		if (!keyHeader)
			throw error(401, 'unauthorised');

		const [key, iv] = keyHeader.split('-');
		if (!key || !iv)
			throw error(400, 'invalid_api_key');

		const decrypted = await crypto.subtle.decrypt(
			{
				iv: base64.toArrayBuffer(iv),
				name: 'AES-GCM'
			},
			await getMellowServerApiEncryptionKey(),
			base64.toArrayBuffer(key)
		);
		const [id, timestamp] = new TextDecoder().decode(decrypted).split('\u0143');
		if (!id || !timestamp)
			throw error(400, 'invalid_api_key');

		if (event.params.id !== id)
			throw error(400, 'incorrect_server_id');

		const response = await supabase.from('mellow_servers')
			.select('*', { head: true, count: 'exact' })
			.eq('id', id)
			.eq('api_key_created_at', timestamp);
		handleResponse(response);

		if (!response.count)
			throw error(400, 'invalid_api_key');

		return { id };
	};
	
	const response = await resolve(event, {
		filterSerializedResponseHeaders: name => name === 'content-range'
	});
	response.headers.append('Access-Control-Allow-Origin', allowOrigin);
	response.headers.append('Access-Control-Allow-Credentials', 'true');

	return response;
}) satisfies Handle;