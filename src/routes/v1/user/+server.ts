import { z } from 'zod';

import { parseBody } from '$lib/util';
import type { RequestHandler } from './$types';
import supabase, { handleResponse } from '$lib/supabase';
import { USERNAME_REGEX, DISPLAY_NAME_REGEX } from '$lib/constants';

const PATCH_PAYLOAD = z.object({
	bio: z.string().max(200).nullable().optional(),
	name: z.string().min(3).max(20).regex(DISPLAY_NAME_REGEX).nullable().optional(),
	username: z.string().min(3).max(20).regex(USERNAME_REGEX).optional()
});
export const PATCH = (async ({ locals: { getUser }, request }) => {
	const user = await getUser();
	const body = await parseBody(request, PATCH_PAYLOAD);
	const response = await supabase.from('users')
		.update({
			...body,
			is_edited: true
		})
		.eq('id', user.id);
	handleResponse(response);

	return new Response();
}) satisfies RequestHandler;
