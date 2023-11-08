import { z } from 'zod';
import base64 from '@hexagon/base64';
import { json } from '@sveltejs/kit';

import supabase, { handleResponse } from '$lib/supabase';
import { parseBody, throwIfUserNotInSudo } from '$lib/util';
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
	const supascopes = scopes.flatMap(item => item.operations.map(operation => `${item.type}:${operation}`));
	
	const response = await supabase.from('application_authorisations')
		.select('id, scopes')
		.eq('user_id', sub)
		.eq('application_id', application_id)
		.limit(1)
		.maybeSingle();
	handleResponse(response);

	if (!response.data || !supascopes.every(item => response.data!.scopes.includes(item)))
		await throwIfUserNotInSudo(sub);

	const redirectUri = new URL(z.string().url().parse(decodeURIComponent(redirect_uri)));
	const response2 = await (response.data ? supabase.from('application_authorisations')
		.update({
			scopes: supascopes
		})
		.eq('id', response.data.id)
		.order('created_at') : supabase.from('application_authorisations')
			.insert({
				scopes: supascopes,
				user_id: sub,
				application_id
			})
		)
		.select('id')
		.limit(1)
		.single();
	handleResponse(response2);

	const id = new Uint32Array(64);
	crypto.getRandomValues(id);

	const encodedId = base64.fromArrayBuffer(id, false);
	const response3 = await supabase.from('oauth_response_codes')
		.insert({
			id: encodedId,
			scopes: supascopes,
			user_id: sub,
			application_id
		});
	handleResponse(response3);

	redirectUri.searchParams.set('code', encodedId);
	return json({ redirect_uri: redirectUri.href });
};