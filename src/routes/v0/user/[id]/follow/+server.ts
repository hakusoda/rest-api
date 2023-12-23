import { error } from '$lib/response';
import supabase, { handleResponse } from '$lib/supabase';
export async function POST({ locals: { getSession }, params: { id } }) {
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
}

export async function DELETE({ locals: { getSession }, params: { id } }) {
	const session = await getSession();
	if (session.sub === id)
		throw error(400, 'invalid_body');

	const response = await supabase.from('user_followers')
		.delete()
		.eq('user_id', session.sub)
		.eq('target_user_id', id);
	handleResponse(response);

	return new Response();
}