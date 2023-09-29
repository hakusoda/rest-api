import { z } from 'zod';
import base64 from '@hexagon/base64';
import { json } from '@sveltejs/kit';

import { parseBody } from '$lib/util';
import supabase, { handleResponse } from '$lib/supabase';
import { OAUTH_SCOPES, OAUTH_SCOPE_OPERATIONS } from '$lib/constants';
const POST_PAYLOAD = z.object({
	scopes: z.array(z.object({
		type: z.enum(OAUTH_SCOPES),
		operations: z.array(z.enum(OAUTH_SCOPE_OPERATIONS)).min(1).max(1)
	})).min(1).max(1),
	redirect_uri: z.string(),
	application_id: z.string().uuid()
});
export const POST = async ({ locals: { getSession }, request }) => {
	const { sub } = await getSession();

	const { scopes, redirect_uri, application_id } = await parseBody(request, POST_PAYLOAD);

	const redirectUri = new URL(z.string().url().parse(decodeURIComponent(redirect_uri)));

	const id = new Uint32Array(64);
	crypto.getRandomValues(id);

	const encodedId = base64.fromArrayBuffer(id, false)
	const response = await supabase.from('oauth_response_codes')
		.insert({
			id: encodedId,
			scopes: scopes.map(item => item.type),
			user_id: sub,
			application_id
		});
	handleResponse(response);

	redirectUri.searchParams.set('code', encodedId);
	return json({ redirect_uri: redirectUri.href });
};