import { json } from '@sveltejs/kit';

import { error } from '$lib/response';
import { SYNC_ACTION } from '$lib/schemas/mellow/syncing';
import supabase, { header, handleResponse } from '$lib/supabase';
import { parseBody, isUserMemberOfMellowServer } from '$lib/util';
export async function POST({ locals: { getSession }, params: { id }, request }) {
	const session = await getSession();
	if (isNaN(parseInt(id)))
		throw error(400, 'invalid_id');

	if (!await isUserMemberOfMellowServer(session.sub, id))
		throw error(403, 'no_permission');

	const body = await parseBody(request, SYNC_ACTION);
	const response = handleResponse(
		await header(supabase.from('mellow_server_sync_actions')
			.insert({
				...body,
				server_id: id,
				creator_id: session.sub
			}), 'x-actionee-id', session.sub
		)
		.select('id, kind, criteria, action_data, display_name, creator:users!mellow_server_sync_actions_creator_id_fkey ( name, username ), created_at, updated_at, updated_by:users!mellow_server_sync_actions_updated_by_fkey ( name, username )')
		.limit(1)
		.single()
	);

	return json(response.data);
}