import { SignJWT } from 'jose';
import { redirect } from '@sveltejs/kit';

import { error } from '$lib/response';
import { UserConnectionType } from '$lib/enums';
import supabase, { handleResponse } from '$lib/supabase';
import { JWT_SECRET, WEBSITE_URL, USER_CONNECTION_CALLBACKS } from '$lib/constants';

export async function GET({ url, locals: { getSession }, cookies }) {
	const session = await getSession(false);
	if (session)
		throw error(400, 'session_mot_allowed');

	const state = url.searchParams.get('state');
	if (!state)
		throw error(400, 'missing_state');

	const { sub, name, username, avatar_url, website_url } = await USER_CONNECTION_CALLBACKS[UserConnectionType.Discord](url);

	const response = await supabase.from('users')
		.insert({
			name,
			username: `mellow_${crypto.randomUUID()}`,
			avatar_url,
			mellow_pending_signup: true
		})
		.select('id')
		.limit(1)
		.single();
	handleResponse(response);

	handleResponse(await supabase.from('user_connections')
		.insert({
			sub,
			type: UserConnectionType.Discord,
			user_id: response.data!.id,
			username,
			avatar_url,
			website_url,
			display_name: name || username
		})
	);

	const token = await new SignJWT({
		sub: response.data!.id,
		mellow_username: username,
		mellow_user_state: state
	})
		.setProtectedHeader({ alg: 'HS256' })
		.setIssuedAt()
		.setExpirationTime('5m')
		.sign(JWT_SECRET);

	cookies.set('auth-token', token, { path: '/', domain: '.hakumi.cafe', expires: new Date(Date.now() + 300000), sameSite: 'none', httpOnly: false });

	throw redirect(302, `${WEBSITE_URL}/mellow/finish_signup`);
}