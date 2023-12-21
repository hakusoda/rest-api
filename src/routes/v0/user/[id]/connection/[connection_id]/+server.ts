import { error } from '$lib/response';
import type { RequestHandler } from './$types';
import supabase, { handleResponse } from '$lib/supabase';
export const DELETE = (async ({ locals: { getSession }, params: { id, connection_id } }) => {
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
}) satisfies RequestHandler;