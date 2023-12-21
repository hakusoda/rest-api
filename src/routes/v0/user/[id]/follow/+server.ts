import { error } from '$lib/response';
import type { RequestHandler } from './$types';
import supabase, { handleResponse } from '$lib/supabase';
export const POST = (async ({ locals: { getSession }, params: { id } }) => {
	const session = await getSession();
	if (session.sub === id)
		throw error(400, 'invalid_body');

	const response = await supabase.from('user_followers')
		.upsert({
			user_id: session.sub,
			target_user_id: id
		});
	handleResponse(response);

	return new Response();
}) satisfies RequestHandler;

export const DELETE = (async ({ locals: { getSession }, params: { id } }) => {
	const session = await getSession();
	if (session.sub === id)
		throw error(400, 'invalid_body');
3
	const response = await supabase.from('user_followers')
		.delete()
		.eq('user_id', session.sub)
		.eq('target_user_id', id);
	handleResponse(response);

	return new Response();
}) satisfies RequestHandler;