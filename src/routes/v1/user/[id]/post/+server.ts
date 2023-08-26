import { z } from 'zod';
import { json } from '@sveltejs/kit';

import { error } from '$lib/response';
import { parseBody } from '$lib/util';
import type { RequestHandler } from './$types';
import supabase, { handleResponse } from '$lib/supabase';

const POST_PAYLOAD = z.object({
	content: z.string().min(1).max(500),
	attachments: z.array(z.object({
		url: z.string().url().max(200)
	})).max(2).optional()
});
export const POST = (async ({ locals: { getUser }, params: { id }, request }) => {
	const user = await getUser();
	if (user.id !== id)
		throw error(403, 'forbidden');

	const { content, attachments } = await parseBody(request, POST_PAYLOAD);
	const response = await supabase.from('profile_posts')
		.insert({
			content,
			user_author_id: id
		})
		.select('id, content, created_at')
		.limit(1)
		.single();
	handleResponse(response);

	if (attachments?.length) {
		const response2 = await supabase.from('profile_post_attachments')
			.insert(attachments.map(item => ({
				...item,
				post_id: response.data!.id
			})));
		handleResponse(response2);
	}

	return json({
		...response.data,
		attachments: attachments ?? []
	});
}) satisfies RequestHandler;
export const OPTIONS = () => new Response();