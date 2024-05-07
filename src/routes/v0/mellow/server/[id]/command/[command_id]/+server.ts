import { z } from 'zod';

import { error } from '$lib/response';
import supabase, { header, handleResponse } from '$lib/supabase';
import { parseBody, object_has_defined, isUserMemberOfMellowServer } from '$lib/util';

const PATCH_BODY = z.object({
	name: z.string().min(1).max(32).optional(),
	description: z.string().min(1).max(1000).optional()
});
export async function PATCH({ locals: { getSession }, params: { id, command_id }, request }) {
	const session = await getSession();
	if (!await isUserMemberOfMellowServer(session.sub, id))
		throw error(403, 'no_permission');

	const body = await parseBody(request, PATCH_BODY);
	if (!object_has_defined(body))
		throw error(400, 'invalid_request');

	handleResponse(
		await header(supabase.from('mellow_server_commands')
			.update({
				name: body.name,
				description: body.description
			}),
			'x-actionee-id', session.sub
		)
		.eq('id', command_id)
		.eq('server_id', id)
	);

	return new Response();
}

export async function DELETE({ locals: { getSession }, params: { id, command_id } }) {
	const session = await getSession();
	if (!await isUserMemberOfMellowServer(session.sub, id))
		throw error(403, 'no_permission');

	handleResponse(
		await header(supabase.from('mellow_server_commands')
			.delete(),
			'x-actionee-id', session.sub
		)
		.eq('id', command_id)
		.eq('server_id', id)
	);

	return new Response();
}