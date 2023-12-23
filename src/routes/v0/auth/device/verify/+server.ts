import { z } from 'zod';
import { kv } from '@vercel/kv';
import { json } from '@sveltejs/kit';

import { error } from '$lib/response';
import type { UserAddDeviceData } from '$lib/types';
import supabase, { handleResponse } from '$lib/supabase';
import { parseBody, readAttestation, getRequestOrigin } from '$lib/util';

const POST_PAYLOAD = z.object({
	name: z.string(),
	challenge: z.string(),
	transports: z.array(z.string()),
	attestation: z.string(),
	platform_version: z.string().optional()
});
export async function POST({ locals: { getSession }, request }) {
	const session = await getSession();
	const { name, challenge, transports, attestation, platform_version } = await parseBody(request, POST_PAYLOAD);

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

	return json(response2.data!);
}