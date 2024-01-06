import { z } from 'zod';
import { redirect } from '@sveltejs/kit';

import { error } from '$lib/response';
import { UserConnectionType } from '$lib/enums';
import supabase, { handleResponse } from '$lib/supabase';
import { WEBSITE_URL, USER_CONNECTION_CALLBACKS } from '$lib/constants';

const ENUM = z.nativeEnum(UserConnectionType);
export async function GET({ url, locals: { getSession }, params }) {
	const type = await ENUM.parseAsync(parseInt(params.id)).catch(() => { throw error(400, 'invalid_type') });
	const session = await getSession();
	const { sub, name, username, avatar_url, website_url } = await USER_CONNECTION_CALLBACKS[type](url);

	const response = await supabase.from('user_connections')
		.select('id')
		.eq('sub', sub)
		.eq('type', type)
		.limit(1)
		.maybeSingle();
	handleResponse(response);

	let id = response.data?.id;
	if (!response.data) {
		id = handleResponse(await supabase.from('user_connections')
			.insert({
				sub,
				type,
				user_id: session.sub,
				username,
				avatar_url,
				website_url,
				display_name: name || username
			})
			.select('id')
			.limit(1)
			.single()
		).data!.id;
	}

	const state = url.searchParams.get('state');
	const match = state?.match(/mellow_onboarding_(.*)/)?.[1];
	if (match) {
		handleResponse(await supabase.from('mellow_user_server_connections')
			.insert({
				user_id: session.sub,
				server_id: match,
				connection_id: id
			})
		);
		throw redirect(302, `${WEBSITE_URL}/mellow/server/${match}/onboarding?done`);
	}

	const redirectUrl = url.searchParams.get('redirect_url');
	throw redirect(302, redirectUrl ? redirectUrl.startsWith('/') ? `${WEBSITE_URL}${redirectUrl}` : redirectUrl : `${WEBSITE_URL}/settings/account/connections`);
}