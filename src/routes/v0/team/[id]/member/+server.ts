import { error } from '$lib/response';
import { isUUID } from '$lib/util';
import supabase, { handleResponse } from '$lib/supabase';
export async function DELETE({ locals: { getSession }, params: { id } }) {
	const session = await getSession();
	const response = await supabase.from('teams')
		.select('id, owner_id')
		.eq(isUUID(id) ? 'id' : 'name', id)
		.limit(1)
		.maybeSingle();
	handleResponse(response);

	if (!response.data)
		throw error(404, 'team_not_found');

	if (response.data.owner_id === session.sub)
		throw error(400, 'cannot_leave_team');

	const response2 = await supabase.from('team_members').delete().eq('user_id', session.sub).eq('team_id', response.data.id);
	handleResponse(response2);

	return new Response();
}