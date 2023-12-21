import { z } from 'zod';
import { json } from '@sveltejs/kit';
import { SignJWT } from 'jose';

import { error } from '$lib/response';
import { parseBody } from '$lib/util';
import { JWT_SECRET } from '$lib/constants';
import type { RequestHandler } from './$types';
import supabase, { handleResponse } from '$lib/supabase';
const POST_PAYLOAD = z.object({
	code: z.string(),
	application_id: z.string().uuid(),
	application_secret: z.string()
});
export const POST = (async ({ request }) => {
	const { code, application_id, application_secret } = await parseBody(request, POST_PAYLOAD);

	const response = await supabase.from('applications')
		.select('*', { head: true, count: 'exact' })
		.eq('id', application_id)
		.eq('secret_key', application_secret);
	handleResponse(response);

	if (!response.count)
		throw error(404, 'application_not_found');

	const response2 = await supabase.from('oauth_response_codes')
		.delete()
		.eq('id', code)
		.eq('application_id', application_id)
		.select('user_id, scopes')
		.order('created_at')
		.limit(1)
		.single();
	handleResponse(response2);

	const access_token = await new SignJWT({
		sub: response2.data!.user_id,
		scopes: response2.data!.scopes,
		application_id
	})
		.setProtectedHeader({ alg: 'HS256' })
		.setIssuedAt()
		.sign(JWT_SECRET);

	return json({ access_token });
}) satisfies RequestHandler;