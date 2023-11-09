import { z } from 'zod';
import { SignJWT } from 'jose';
import { redirect } from '@sveltejs/kit';

import { error } from '$lib/response';
import { parseQuery } from '$lib/util';
import { UserConnectionType } from '$lib/enums';
import type { RequestHandler } from './$types';
import supabase, { handleResponse } from '$lib/supabase';
import { JWT_SECRET, WEBSITE_URL, USER_CONNECTION_CALLBACKS } from '$lib/constants';

const ENUM = z.nativeEnum(UserConnectionType);
const KEY_QUERY = z.object({
	state: z.string()
});
export const GET = (async ({ url, locals: { getSession }, params, cookies, request }) => {
	const type = await ENUM.parseAsync(parseInt(params.id)).catch(() => { throw error(400, 'invalid_type') });
	const session = await getSession(false, false).catch(() => null);
	const { sub, name, username, metadata, avatar_url, website_url } = await USER_CONNECTION_CALLBACKS[type](url);

	const response = await supabase.from('user_connections')
		.select('id, user_id')
		.eq('sub', sub)
		.eq('type', type)
		.limit(1)
		.maybeSingle();
	handleResponse(response);

	let user_id = session?.sub ?? response.data?.user_id ?? crypto.randomUUID();
	let connection_id = response.data?.id;
	if (!response.data || session) {
		if (!session) {
			const response = await supabase.from('users')
				.insert({
					id: user_id,
					name,
					username,
					avatar_url
				});
			handleResponse(response);
		}

		const response2 = await supabase.from('user_connections')
			.insert({ sub, type, user_id, metadata, avatar_url, website_url })
			.select('id')
			.limit(1)
			.single();
		handleResponse(response2);

		connection_id = response2.data!.id;
	}

	if (session)
		throw redirect(302, `${WEBSITE_URL}/settings/account/connections`);

	const { state: device_public_key } = await parseQuery(request, KEY_QUERY);
	const token = await new SignJWT({
		sub: user_id,
		device_public_key,
		source_connection_id: connection_id,
		source_connection_type: type
	})
		.setProtectedHeader({ alg: 'HS256' })
		.setIssuedAt()
		.sign(JWT_SECRET);

	cookies.set('auth-token', token, { path: '/', domain: '.voxelified.com', expires: new Date(Date.now() + 31556926000), sameSite: 'none', httpOnly: false });

	const redirectUri = url.searchParams.get('redirect_uri');
	throw redirect(302, redirectUri?.startsWith('https://') ? redirectUri : `${WEBSITE_URL}${redirectUri || `/user/${user_id}`}`);
}) satisfies RequestHandler;