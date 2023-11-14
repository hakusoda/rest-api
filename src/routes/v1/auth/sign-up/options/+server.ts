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
		.select('*', { head: true, count: 'exact' })
		.eq('username', username);
	handleResponse(response);

	if (response.count)
		throw error(400, 'username_taken');

	const id = crypto.randomUUID();
	const challenge = new Uint32Array(32);
	crypto.getRandomValues(challenge);

	const encodedChallenge = base64.fromArrayBuffer(challenge, false);
	const options = {
		rp: {
			id: RELYING_PARTY_ID,
			name: 'HAKUMI'
		},
		user: {
			id: id as any,
			name: username,
			displayName: username
		},
		timeout: 60000,
		challenge: encodedChallenge as any,
		attestation: 'direct',
		pubKeyCredParams: [{ alg: -7, type: 'public-key' }, { alg: -257, type: 'public-key' }],
		excludeCredentials: [],
		authenticatorSelection: {
			authenticatorAttachment: 'platform'
		}
	} satisfies PublicKeyCredentialCreationOptions;
	
	await kv.set(`auth_signup_${username}`, {
		id,
		username,
		challenge: encodedChallenge
	});

	return json(options);
}) satisfies RequestHandler;