import { z } from 'zod';
import { json } from '@sveltejs/kit';

import { ApiFeatureFlag } from '$lib/enums';
import type { RequestHandler } from './$types';
import supabase, { handleResponse } from '$lib/supabase';
import { parseBody, throwIfFeatureNotEnabled } from '$lib/util';

const POST_PAYLOAD = z.object({
	content: z.string().min(1).max(500)
});
export const POST = (async ({ locals: { getSession }, params: { post_id }, request }) => {
	await throwIfFeatureNotEnabled(ApiFeatureFlag.ProfilePostCreation);
	
	const session = await getSession();
	const body = await parseBody(request, POST_PAYLOAD);
	const response = await supabase.from('profile_posts')
		.insert({
			...body,
			parent_post_id: post_id,
			user_author_id: session.sub
		})
		.select('id, content, created_at')
		.limit(1)
		.single();
	handleResponse(response);

	return json(response.data);
}) satisfies RequestHandler;
