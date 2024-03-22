import { z } from 'zod';
import { redirect } from '@sveltejs/kit';

import { error } from '$lib/response';
import { MELLOW_API_KEY } from '$env/static/private';
import { UserConnectionType } from '$lib/enums';
import supabase, { handleResponse } from '$lib/supabase';
import { WEBSITE_URL, USER_CONNECTION_CALLBACKS } from '$lib/constants';

const ENUM = z.nativeEnum(UserConnectionType);
export async function GET({ url, locals: { getSession }, params }) {
	const type = await ENUM.parseAsync(parseInt(params.id)).catch(() => { throw error(400, 'invalid_type') });
	const session = await getSession();
	const { sub, name, username, avatar_url, website_url, oauth_authorisation } = await USER_CONNECTION_CALLBACKS[type](url);

	const response = await supabase.from('user_connections')
		.select('id')
		.eq('sub', sub)
		.eq('type', type)
		.eq('user_id', session.sub)
		.limit(1)
		.maybeSingle();
	handleResponse(response);

	let id = response.data?.id;
	const full_data = {
		sub,
		type,
		user_id: session.sub,
		username,
		avatar_url,
		website_url,
		display_name: name || username
	} as any;
	if (!response.data) {
		id = handleResponse(await supabase.from('user_connections')
			.insert(full_data)
			.select('id')
			.limit(1)
			.single()
		).data!.id;
	}

	full_data.id = id;

	if (oauth_authorisation)
		handleResponse(await supabase.from('user_connection_oauth_authorisations')
			.insert({
				user_id: session.sub,
				connection_id: id,
				...oauth_authorisation
			})
		);

	const state = url.searchParams.get('state');
	if (state?.startsWith('mellow_user_settings')) {
		const data = state.match(/\.(\d+)(.as_new_member)?$/);
		if (data?.[1]) {
			handleResponse(await supabase.from('mellow_user_server_settings')
				.upsert({
					user_id: session.sub,
					server_id: data[1],
					user_connections: [{ id }]
				}, { onConflict: 'user_id,server_id' })
			);

			const response = handleResponse(await supabase.from('user_connections')
				.select('sub')
				.eq('type', UserConnectionType.Discord)
				.eq('user_id', session.sub)
				.limit(1)
				.single()
			);
			await fetch(`https://mellow-internal-api.hakumi.cafe/server/${data[1]}/member/${response.data!.sub}/sync`, {
				body: '{"is_sign_up":true}',
				method: 'POST',
				headers: {
					'x-api-key': MELLOW_API_KEY,
					'content-type': 'application/json'
				}
			});
			throw redirect(302, `${WEBSITE_URL}/mellow/server/${data[1]}/user_settings${data[2] ? '?as_new_member' : ''}`);
		} else
			throw redirect(302, `${WEBSITE_URL}/mellow/user_settings_popup#${encodeURIComponent(JSON.stringify(full_data))}`);
	}

	const redirectUrl = url.searchParams.get('redirect_url');
	throw redirect(302, redirectUrl ? redirectUrl.startsWith('/') ? `${WEBSITE_URL}${redirectUrl}` : redirectUrl : `${WEBSITE_URL}/settings/account/connections`);
}