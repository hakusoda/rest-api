import { kv } from '@vercel/kv';
import base64 from '@hexagon/base64';
import { json } from '@sveltejs/kit';

import { RELYING_PARTY_ID } from '$lib/constants';
import type { RequestHandler } from './$types';
export const GET = (async ({ locals: { getSession } }) => {
	const session = await getSession();
	const challenge = new Uint32Array(32);
	crypto.getRandomValues(challenge);

	const encodedChallenge = base64.fromArrayBuffer(challenge, false);
	const options = {
		rp: {
			id: RELYING_PARTY_ID,
			name: 'HAKUMI'
		},
		user: {
			id: session.sub,
			name: session.sub,
			displayName: session.sub
		},
		timeout: 60000,
		challenge: encodedChallenge as any,
		attestation: 'direct',
		pubKeyCredParams: [{ alg: -7, type: 'public-key' }, { alg: -257, type: 'public-key' }],
		excludeCredentials: [],
		authenticatorSelection: {
			authenticatorAttachment: 'platform'
		}
	};
	await kv.set(`auth_adddevice_${session.sub}`, { challenge: encodedChallenge });

	return json(options);
}) satisfies RequestHandler;