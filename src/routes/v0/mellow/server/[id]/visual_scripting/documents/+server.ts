import { z } from 'zod';
import { json } from '@sveltejs/kit';

import { error } from '$lib/response';
import { Element } from '$lib/schemas/visual_scripting';
import supabase, { header, handleResponse } from '$lib/supabase';
import { parseBody, isUserMemberOfMellowServer } from '$lib/util';

const POST_BODY = z.object({
	name: z.string().min(1).max(64),
	kind: z.string(),
	definition: z.array(Element).max(10)
});
export async function POST({ locals: { getSession }, params: { id }, request }) {
	const session = await getSession();
	if (!await isUserMemberOfMellowServer(session.sub, id))
		throw error(403, 'no_permission');

	const body = await parseBody(request, POST_BODY);
	const response = handleResponse(
		await header(supabase.from('visual_scripting_documents')
			.insert({
				...body,
				creator_id: session.sub,
				mellow_server_id: id
			}),
			'x-actionee-id', session.sub
		)
		.select('id, name, kind, definition, created_by:users ( id, name, username, avatar_url )')
		.limit(1)
		.single()
	);

	return json(response.data);
}