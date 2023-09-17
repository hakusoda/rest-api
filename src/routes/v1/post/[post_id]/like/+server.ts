import type { RequestHandler } from './$types';
import supabase, { handleResponse } from '$lib/supabase';
export const POST = (async ({ locals: { getSession }, params: { post_id } }) => {
	const session = await getSession();
	const response = await supabase.from('profile_post_likes')
		.upsert({
			post_id,
			user_id: session.sub
		});
	handleResponse(response);

	return new Response();
}) satisfies RequestHandler;

export const DELETE = (async ({ locals: { getSession }, params: { post_id } }) => {
	const session = await getSession();
	const response = await supabase.from('profile_post_likes')
		.delete()
		.eq('post_id', post_id)
		.eq('user_id', session.sub);
	handleResponse(response);

	return new Response();
}) satisfies RequestHandler;