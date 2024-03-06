import { z } from 'zod';
import { kv } from '@vercel/kv';
import { json } from '@sveltejs/kit';
import { SignJWT } from 'jose';

import { error } from '$lib/response';
import { JWT_SECRET } from '$lib/constants';
import { MELLOW_API_KEY } from '$env/static/private';
import type { UserAddDeviceData } from '$lib/types';
import supabase, { handleResponse } from '$lib/supabase';
import { parseBody, readAttestation, getRequestOrigin } from '$lib/util';

const POST_PAYLOAD = z.object({
	name: z.string(),
	challenge: z.string(),
	transports: z.array(z.string()),
	attestation: z.string(),
	platform_version: z.string().optional(),
	device_public_key: z.string().optional()
});
export async function POST({ locals: { getSession }, cookies, request }) {
	const session = await getSession();
	const { name, challenge, transports, attestation, platform_version, device_public_key } = await parseBody(request, POST_PAYLOAD);

	const kvKey = `auth_adddevice_${session.sub}`;
	const data = await kv.get<UserAddDeviceData>(kvKey);
	if (!data || data.challenge !== challenge)
		throw error(400, 'invalid_body');

	const { id, publicKey } = readAttestation(attestation);

	const response2 = await supabase.from('user_devices')
		.insert({
			id,
			name,
			user_id: session.sub,
			transports,
			public_key: publicKey,
			...getRequestOrigin(request, platform_version)
		})
		.select('id, name, user_os, user_country, user_platform')
		.single();
	handleResponse(response2);

	if ((session.source_connection_id || session.mellow_user_state) && device_public_key) {
		const token = await new SignJWT({ sub: session.sub, source_device_id: id, device_public_key })
			.setProtectedHeader({ alg: 'HS256' })
			.setIssuedAt()
			.sign(JWT_SECRET);

		cookies.set('auth-token', token, { path: '/', domain: '.hakumi.cafe', expires: new Date(Date.now() + 31556926000), sameSite: 'none', httpOnly: false });

		const username = session.mellow_username;
		if (username)
			handleResponse(await supabase.from('users')
				.update({ username, mellow_pending_signup: false })
				.eq('id', session.sub)
			);

		const mellow = session.mellow_user_state;
		if (mellow && mellow.startsWith('setup_'))
			await fetch(`https://mellow-internal-api.hakumi.cafe/server/${id}/member/${response.data!.sub}/sync`, {
				body: '{"is_sign_up":true}',
				method: 'POST',
				headers: {
					'x-api-key': MELLOW_API_KEY,
					'content-type': 'application/json'
				}
			});
	}

	return json(response2.data!);
}