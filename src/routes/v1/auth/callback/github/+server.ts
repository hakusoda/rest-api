import { SignJWT } from 'jose';
import { redirect } from '@sveltejs/kit';

import { error } from '$lib/response';
import { createRefreshToken } from '$lib/util';
import { UserConnectionType } from '$lib/enums';
import type { RequestHandler } from './$types';
import { JWT_SECRET, WEBSITE_URL } from '$lib/constants';
import supabase, { handleResponse } from '$lib/supabase';
import { GITHUB_ID, GITHUB_SECRET } from '$env/static/private';
export const GET = (async ({ url, locals: { getSession }, cookies, request }) => {
	const session = await getSession(false).catch(() => null);
	const code = url.searchParams.get('code');
	if (!code)
		throw error(400, 'invalid_query');

	const params = new URLSearchParams({
		code,
		client_id: GITHUB_ID,
		client_secret: GITHUB_SECRET
	});
	const { access_token } = await fetch('https://github.com/login/oauth/access_token', {
		body: params,
		method: 'POST',
		headers: { accept: 'application/json', 'content-type': 'application/x-www-form-urlencoded;charset=UTF-8' }
	}).then(response => response.json());
	const metadata = await fetch('https://api.github.com/user', {
		headers: {
			accept: 'application/json',
			authorization: `Bearer ${access_token}`
		}
	}).then(response => response.json());
	const { id, name, login, avatar_url } = metadata;
	if (!id)
		throw error(500, 'unknown');

	const response = await supabase.from('user_connections')
		.select('id, user_id')
		.eq('sub', id)
		.eq('type', UserConnectionType.GitHub)
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
					username: login,
					avatar_url
				});
			handleResponse(response);
		}

		const response2 = await supabase.from('user_connections')
			.insert({
				sub: id,
				name: `${name} (@${login})`,
				type: UserConnectionType.GitHub,
				user_id,
				metadata
			})
			.select('id')
			.limit(1)
			.single();
		handleResponse(response2);

		connection_id = response2.data!.id;
	}

	if (session)
		throw redirect(302, `${WEBSITE_URL}/settings/account/connections`);

	const token = await new SignJWT({
		sub: user_id,
		source_connection_id: connection_id,
		source_connection_type: UserConnectionType.GitHub
	})
		.setProtectedHeader({ alg: 'HS256' })
		.setIssuedAt()
		.setExpirationTime('1h')
		.sign(JWT_SECRET);

	const refresh = await createRefreshToken(user_id);
	const cookieOptions = { path: '/', domain: '.voxelified.com', expires: new Date(Date.now() + 31556926000), sameSite: 'none', httpOnly: false } as const;
	cookies.set('auth-token', token, cookieOptions);
	cookies.set('refresh-token', refresh, cookieOptions);

	const redirectUri = url.searchParams.get('redirect_uri');
	throw redirect(302, `${WEBSITE_URL}${redirectUri || `/user/${user_id}`}`);
}) satisfies RequestHandler;