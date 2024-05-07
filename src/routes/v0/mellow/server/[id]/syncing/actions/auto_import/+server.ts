import { json } from '@sveltejs/kit';

import { error } from '$lib/response';
import { create_guild_role } from '$lib/discord.js';
import { AUTO_IMPORT_REQUEST } from '$lib/schemas/mellow/syncing';
import supabase, { header, handleResponse } from '$lib/supabase';
import { parseBody, isUserMemberOfMellowServer } from '$lib/util';
export async function POST({ locals: { getSession }, params: { id }, request }) {
	const session = await getSession();
	if (isNaN(parseInt(id)))
		throw error(400, 'invalid_id');

	if (!await isUserMemberOfMellowServer(session.sub, id))
		throw error(403, 'no_permission');

	const body = await parseBody(request, AUTO_IMPORT_REQUEST);
	const items = [];
	for (const item of body.items) {
		if (item.kind === 'roblox.group.role') {
			const discord_role_id = item.discord_role.kind === 'create_new' ?
				(await create_guild_role(id, item.discord_role.name)).id :
				item.discord_role.role_id;
			items.push({
				kind: 'discord.member.assign_roles',
				criteria: {
					items: [{
						kind: 'roblox.group.membership.role',
						role_id: item.role_id,
						group_id: item.group_id
					}],
					quantifier: {
						kind: 'all'
					}
				},
				server_id: id,
				creator_id: session.sub,
				action_data: {
					role_ids: [discord_role_id],
					can_remove: true
				},
				display_name: item.display_name
			});
		}
	}

	const response = handleResponse(
		await header(supabase.from('mellow_server_sync_actions')
			.insert(items),
			'x-actionee-id', session.sub
		)
		.select('id, kind, criteria, action_data, display_name, creator:users!mellow_server_sync_actions_creator_id_fkey ( name, username ), created_at, updated_at, updated_by:users!mellow_server_sync_actions_updated_by_fkey ( name, username )')
	);

	return json(response.data);
}