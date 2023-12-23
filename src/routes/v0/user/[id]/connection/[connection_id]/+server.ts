import { error } from '$lib/response';
import supabase, { handleResponse } from '$lib/supabase';
export async function DELETE({ locals: { getSession }, params: { id, connection_id } }) {
	const session = await getSession();
	if (session.sub !== id)
		throw error(403, 'forbidden');

	const response = await supabase.from('user_connections')
		.delete({ count: 'exact' })
		.eq('id', connection_id)
		.eq('user_id', id);
	handleResponse(response);

	if (!response.count)
		throw error(404, 'user_connection_not_found');
	return new Response();
}