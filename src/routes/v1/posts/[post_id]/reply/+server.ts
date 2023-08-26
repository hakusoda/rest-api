import { z } from 'zod';
import { json } from '@sveltejs/kit';

import { parseBody } from '$lib/util';
import type { RequestHandler } from './$types';
import supabase, { handleResponse } from '$lib/supabase';

const POST_PAYLOAD = z.object({
	content: z.string().min(1).max(500)
});
export const POST = (async ({ locals: { getUser }, params: { post_id }, request }) => {
	const user = await getUser();
	const body = await parseBody(request, POST_PAYLOAD);
	const response = await supabase.from('profile_posts').insert({
		...body,
		parent_post_id: post_id,
		user_author_id: user.id
	}).select('id, content, created_at').limit(1).single();
	handleResponse(response);

	return json(response.data);
}) satisfies RequestHandler;
