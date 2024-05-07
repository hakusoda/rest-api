import { json } from '@sveltejs/kit';

import { error } from '$lib/response';
import { OPEN_CLOUD } from '$lib/roblox';
import { isUserMemberOfMellowServer } from '$lib/util';
export async function GET({ locals: { getSession }, params: { id, group_id } }) {
	const session = await getSession(true);
	if (!await isUserMemberOfMellowServer(session.sub, id))
		throw error(403, 'no_permission');

	const response = await OPEN_CLOUD.groups.roles(group_id, 20);
	return json(response.groupRoles);
}