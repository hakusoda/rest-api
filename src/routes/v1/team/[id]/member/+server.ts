import { error } from '$lib/response';
import { isUUID } from '$lib/util';
import type { RequestHandler } from './$types';
import supabase, { handleResponse } from '$lib/supabase';
export const DELETE = (async ({ locals: { getUser }, params: { id } }) => {
	const user = await getUser();
	const response = await supabase.from('teams')
		.select('id, owner_id')
		.eq(isUUID(id) ? 'id' : 'name', id)
		.limit(1)
		.maybeSingle();
	handleResponse(response);

	if (!response.data)
		throw error(404, 'team_not_found');

	if (response.data.owner_id === user.id)
		throw error(400, 'cannot_leave_team');

	const response2 = await supabase.from('team_members').delete().eq('user_id', user.id).eq('team_id', response.data.id);
	handleResponse(response2);

	return new Response();
}) satisfies RequestHandler;
