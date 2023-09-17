import { z } from 'zod';
import { kv } from '@vercel/kv';
import base64 from '@hexagon/base64';
import { json } from '@sveltejs/kit';

import { error } from '$lib/response';
import { parseBody } from '$lib/util';
import type { RequestHandler } from './$types';
import supabase, { handleResponse } from '$lib/supabase';
import { USERNAME_REGEX, RELYING_PARTY_ID } from '$lib/constants';

const POST_PAYLOAD = z.object({
	username: z.string().min(3).max(20).regex(USERNAME_REGEX)
});
export const POST = (async ({ request }) => {
	const { username } = await parseBody(request, POST_PAYLOAD);
	const response = await supabase.from('users')
		.select('id, devices:user_devices ( id, public_key, transports )')
		.eq('username', username)
		.limit(1)
		.maybeSingle();
	handleResponse(response);

	if (!response.data)
		throw error(404, 'username_not_found');

	const challenge = new Uint32Array(32);
	crypto.getRandomValues(challenge);

	const encodedChallenge = base64.fromArrayBuffer(challenge, false);
	const options = {
		rpId: RELYING_PARTY_ID,
		timeout: 60000,
		challenge: encodedChallenge as any,
		userVerification: 'required',
		allowCredentials: response.data.devices.map(item => ({
			id: item.id,
			type: 'public-key',
			transports: item.transports
		}))
	} satisfies PublicKeyCredentialRequestOptions;
	
	await kv.set(`auth_signin_${username}`, {
		id: response.data.id,
		devices: response.data.devices,
		challenge: encodedChallenge
	});

	return json(options);
}) satisfies RequestHandler;