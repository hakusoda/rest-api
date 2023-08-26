import { error } from '$lib/response';
import type { RequestHandler } from './$types';
import supabase, { handleResponse } from '$lib/supabase';
export const DELETE = (async ({ locals: { getUser }, params: { id, link_id } }) => {
	const user = await getUser();
	if (user.id !== id)
		throw error(403, 'forbidden');

	const response = await supabase.from('roblox_links').delete()
		.eq('id', link_id)
		.eq('owner_id', id);
	handleResponse(response);

	return new Response();
}) satisfies RequestHandler;
