import { z } from 'zod';
import { kv } from '@vercel/kv';
import { json } from '@sveltejs/kit';
import { SignJWT } from 'jose';

import { error } from '$lib/response';
import type { UserAuthSignUpData } from '$lib/types';
import supabase, { handleResponse } from '$lib/supabase';
import { JWT_SECRET, USERNAME_REGEX } from '$lib/constants';
import { parseBody, readAttestation, getRequestOrigin } from '$lib/util';

const POST_PAYLOAD = z.object({
	username: z.string().min(3).max(20).regex(USERNAME_REGEX),
	challenge: z.string(),
	transports: z.array(z.string()),
	attestation: z.string(),
	platform_version: z.string().optional(),
	device_public_key: z.string()
});
export async function POST({ cookies, request }) {
	const { username, challenge, transports, attestation, platform_version, device_public_key } = await parseBody(request, POST_PAYLOAD);

	const kvKey = `auth_signup_${username}`;
	const data = await kv.get<UserAuthSignUpData>(kvKey);
	if (!data || data.challenge !== challenge)
		throw error(400, 'invalid_body');

	const { id, publicKey } = readAttestation(attestation);

	const response = await supabase.from('users')
		.insert({
			id: data.id,
			username: data.username
		});
	handleResponse(response);

	const response2 = await supabase.from('user_devices')
		.insert({
			id,
			user_id: data.id,
			transports,
			public_key: publicKey,
			...getRequestOrigin(request, platform_version)
		});
	handleResponse(response2);

	const token = await new SignJWT({ sub: data.id, source_device_id: id, device_public_key })
		.setProtectedHeader({ alg: 'HS256' })
		.setIssuedAt()
		.sign(JWT_SECRET);

	cookies.set('auth-token', token, { path: '/', domain: '.hakumi.cafe', expires: new Date(Date.now() + 31556926000), sameSite: 'none', httpOnly: false });

	await kv.del(kvKey);
	return json({ user_id: data.id });
}