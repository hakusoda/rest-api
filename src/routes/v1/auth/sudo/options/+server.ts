import { kv } from '@vercel/kv';
import base64 from '@hexagon/base64';
import { json } from '@sveltejs/kit';

import { RELYING_PARTY_ID } from '$lib/constants';
import type { RequestHandler } from './$types';
import supabase, { handleResponse } from '$lib/supabase';
export const GET = (async ({ locals: { getSession } }) => {
	const { sub } = await getSession();
	const response = await supabase.from('users')
		.select('devices:user_devices ( id, public_key, transports )')
		.eq('id', sub)
		.limit(1)
		.single();
	handleResponse(response);

	const challenge = new Uint32Array(32);
	crypto.getRandomValues(challenge);

	const encodedChallenge = base64.fromArrayBuffer(challenge, false);
	const options = {
		rpId: RELYING_PARTY_ID,
		timeout: 60000,
		challenge: encodedChallenge as any,
		userVerification: 'required',
		allowCredentials: response.data!.devices.map(item => ({
			id: item.id,
			type: 'public-key',
			transports: item.transports
		}))
	} satisfies PublicKeyCredentialRequestOptions;
	
	await kv.set(`auth_sudo_${sub}`, {
		id: sub,
		devices: response.data!.devices,
		challenge: encodedChallenge
	});

	return json(options);
}) satisfies RequestHandler;