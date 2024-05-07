import { SignJWT } from 'jose';
import { redirect } from '@sveltejs/kit';

import { error } from '$lib/response';
import { UserConnectionType } from '$lib/enums';
import supabase, { handleResponse } from '$lib/supabase';
import { JWT_SECRET, WEBSITE_URL, USER_CONNECTION_CALLBACKS, get_mellow_communication_key } from '$lib/constants';
export async function GET({ url, locals: { getSession }, cookies }) {
	const session = await getSession(false);
	const state = url.searchParams.get('state');
	if (!state)
		throw error(400, 'missing_state');

	const { sub, name, username, avatar_url, website_url } = await USER_CONNECTION_CALLBACKS[UserConnectionType.Discord](url);
	const user_id = session ? session.sub : handleResponse(await supabase.from('users')
		.insert({
			name,
			username,
			avatar_url,
			created_via_mellow: true
		})
		.select('id')
		.limit(1)
		.single()
	).data!.id;

	handleResponse(await supabase.from('user_connections')
		.insert({
			sub,
			type: UserConnectionType.Discord,
			user_id,
			username,
			avatar_url,
			website_url,
			display_name: name || username
		})
	);

	if (!session) {
		const token = await new SignJWT({ sub: user_id, is_mellow_session: true })
			.setProtectedHeader({ alg: 'HS256' })
			.setIssuedAt()
			.sign(JWT_SECRET);

		cookies.set('auth-token', token, { path: '/', domain: '.hakumi.cafe', expires: new Date(Date.now() + 31556926000), sameSite: 'none', httpOnly: false });
	}

	const sync = state.match(/^sync\.(\d+)$/);
	if (sync)
		throw redirect(302, `${WEBSITE_URL}/mellow/server/${sync[1]}/user_settings?as_new_member`);

	/*const setup = state.match(/^setup\.(.+)$/);
	if (setup) {
		const key = await get_mellow_communication_key();
	}*/
	throw error(400, 'you_appear_to_be_lost')
}