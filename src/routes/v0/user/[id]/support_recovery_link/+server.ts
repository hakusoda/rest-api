import base64 from '@hexagon/base64';
import { json } from '@sveltejs/kit';

import { error } from '$lib/response';
import { hasBit } from '$lib/util';
import { UserFlag } from '$lib/enums';
import { WEBSITE_URL } from '$lib/constants';
import supabase, { handleResponse } from '$lib/supabase';
export async function POST({ params: { id }, locals: { getSession } }) {
	const session = await getSession();
	const response = handleResponse(await supabase.from('users')
		.select('flags')
		.eq('id', session.sub)
		.limit(1)
		.single()
	);
	if (!hasBit(response.data!.flags, UserFlag.Staff))
		throw error(403, 'no_permission');

	const link_id = base64.fromArrayBuffer(crypto.getRandomValues(new Uint8Array(32)));
	handleResponse(await supabase.from('user_recovery_links')
		.insert({
			id: link_id,
			user_id: id
		})
	);

	return json({
		recovery_url: `${WEBSITE_URL}/recovery#${link_id}`
	});
}