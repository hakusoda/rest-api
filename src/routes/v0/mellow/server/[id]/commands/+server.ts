import { z } from 'zod';
import { json } from '@sveltejs/kit';

import { error } from '$lib/response';
import { DISCORD_ID, MELLOW_TOKEN } from '$env/static/private';
import supabase, { header, handleResponse } from '$lib/supabase';
import { fetchJson, parseBody, isUserMemberOfMellowServer } from '$lib/util';

const POST_BODY = z.object({
	name: z.string().min(1).max(32),
	kind: z.enum(['slash_command']),
	description: z.string().min(1).max(1000)
});
export async function POST({ locals: { getSession }, params: { id }, request }) {
	const session = await getSession();
	if (!await isUserMemberOfMellowServer(session.sub, id))
		throw error(403, 'no_permission');

	const body = await parseBody(request, POST_BODY);
	const response = handleResponse(
		await header(supabase.from('visual_scripting_documents')
			.insert({
				name: body.name,
				kind: 'mellow.command',
				definition: [],
				creator_id: session.sub,
				mellow_server_id: id
			}),
			'x-actionee-id', session.sub
		)
		.select('id')
		.limit(1)
		.single()
	);

	const data = await fetchJson(`https://discord.com/api/v10/applications/${DISCORD_ID}/guilds/${id}/commands`, {
		body: JSON.stringify({
			name: body.name,
			description: body.description
		}),
		method: 'POST',
		headers: {
			authorization: `Bot ${MELLOW_TOKEN}`,
			'content-type': 'application/json'
		}
	});
	const response2 = handleResponse(
		await header(supabase.from('mellow_server_commands')
			.insert({
				name: body.name,
				kind: body.kind,
				server_id: id,
				creator_id: session.sub,
				description: body.description,
				document_id: response.data!.id,
				discord_command_id: data.id
			}),
			'x-actionee-id', session.sub
		)
		.select('id, name, active, document:visual_scripting_documents ( id, name, kind, definition ), created_at, description')
		.limit(1)
		.single()
	);

	return json(response2.data);
}