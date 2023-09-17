import { SignJWT } from 'jose';
import { redirect } from '@sveltejs/kit';

import { dev } from '$app/environment';
import { error } from '$lib/response';
import { createRefreshToken } from '$lib/util';
import { UserConnectionType } from '$lib/enums';
import type { RequestHandler } from './$types';
import supabase, { handleResponse } from '$lib/supabase';
import { DISCORD_ID, DISCORD_SECRET } from '$env/static/private';
import { API_URL, JWT_SECRET, WEBSITE_URL } from '$lib/constants';
export const GET = (async ({ locals: { getSession }, cookies, request }) => {
	const session = await getSession(false).catch(() => null);
	const code = new URL(request.url).searchParams.get('code');
	if (!code)
		throw error(400, 'invalid_query');

	const params = new URLSearchParams();
	params.set('code', code);
	params.set('client_id', DISCORD_ID);
	params.set('grant_type', 'authorization_code');
	params.set('redirect_uri', `${API_URL}/v1/auth/callback/discord`);
	params.set('client_secret', DISCORD_SECRET);

	const { token_type, access_token } = await fetch('https://discord.com/api/v10/oauth2/token', {
		body: params,
		method: 'POST', 
		headers: {
			'content-type': 'application/x-www-form-urlencoded'
		}
	}).then(response => response.json());
	if (!access_token)
		throw error(500, 'unknown');

	const metadata = await fetch('https://discord.com/api/v10/users/@me', {
		headers: { authorization: `${token_type} ${access_token}` }
	}).then(response => response.json());
	const { id, avatar, username, global_name } = metadata;
	if (!id)
		throw error(500, 'unknown');

	const response = await supabase.from('user_connections')
		.select('user_id')
		.eq('sub', id)
		.eq('type', UserConnectionType.Discord)
		.limit(1)
		.maybeSingle();
	handleResponse(response);

	let user_id = session?.sub ?? response.data?.user_id ?? crypto.randomUUID();
	if (!response.data || session) {
		if (!session) {
			const response = await supabase.from('users')
				.insert({
					id: user_id,
					name: global_name,
					username,
					avatar_url: avatar ? `https://cdn.discordapp.com/avatars/${id}/${avatar}.${avatar.startsWith('a_') ? 'gif' : 'webp'}?size=256` : null
				});
			handleResponse(response);
		}

		const response2 = await supabase.from('user_connections')
			.insert({
				sub: id,
				type: UserConnectionType.Discord,
				name: `${global_name ?? username} (@${username})`,
				user_id,
				metadata
			});
		handleResponse(response2);
	}

	if (session)
		throw redirect(302, `${WEBSITE_URL}/settings/account/connections`);

	const token = await new SignJWT({ sub: user_id })
		.setProtectedHeader({ alg: 'HS256' })
		.setIssuedAt()
		.setExpirationTime('1h')
		.sign(JWT_SECRET);

	const refresh = await createRefreshToken(user_id);
	const cookieOptions = { path: '/', domain: '.voxelified.com', expires: new Date(Date.now() + 31556926000), sameSite: 'none', httpOnly: false } as const;
	cookies.set('auth-token', token, cookieOptions);
	cookies.set('refresh-token', refresh, cookieOptions);

	throw redirect(302, `${WEBSITE_URL}/user/${user_id}`);
}) satisfies RequestHandler;