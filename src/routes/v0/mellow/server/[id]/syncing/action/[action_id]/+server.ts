import { json } from '@sveltejs/kit';

import { error } from '$lib/response';
import supabase, { header, handleResponse } from '$lib/supabase';
import { parseBody, isUserMemberOfMellowServer } from '$lib/util';
import { SYNC_ACTION_TRANSFORMER, SYNC_ACTION_UNTRANSFORMED } from '$lib/schemas/mellow/syncing';
export async function PATCH({ locals: { getSession }, params: { id, action_id }, request }) {
	const session = await getSession();
	if (!await isUserMemberOfMellowServer(session.sub, id))
		throw error(403, 'no_permission');

	const body = await parseBody(request, SYNC_ACTION_UNTRANSFORMED.partial().transform(SYNC_ACTION_TRANSFORMER));
	const author = await supabase.from('users')
		.select('name, username')
		.eq('id', session.sub)
		.limit(1)
		.single();
	handleResponse(author);

	if (body.kind || body.criteria || body.action_data || body.display_name) {
		const response = handleResponse(
			await header(supabase.from('mellow_server_sync_actions')
				.update({
					...body,
					updated_at: new Date(),
					updated_by: session.sub
				}),
				'x-actionee-id', session.sub
			)
			.eq('id', action_id)
			.eq('server_id', id)
			.select('id, kind, criteria, action_data, display_name, creator:users!mellow_server_sync_actions_creator_id_fkey ( name, username ), created_at, updated_at, updated_by:users!mellow_server_sync_actions_updated_by_fkey ( name, username )')
			.single()
		);
		return json(response.data);
	}

	return new Response(null, { status: 201 });
}

export async function DELETE({ locals: { getSession }, params: { id, action_id } }) {
	const session = await getSession();
	if (!await isUserMemberOfMellowServer(session.sub, id))
		throw error(403, 'no_permission');

	handleResponse(
		await header(supabase.from('mellow_server_sync_actions')
			.delete(),
			'x-actionee-id', session.sub
		)
		.eq('id', action_id)
		.eq('server_id', id)
	);

	return new Response(null, { status: 201 });
}