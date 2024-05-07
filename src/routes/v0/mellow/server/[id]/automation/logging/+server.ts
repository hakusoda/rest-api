import { z } from 'zod';

import { error } from '$lib/response';
import { DISCORD_SNOWFLAKE } from '$lib/schemas/discord';
import supabase, { header, handleResponse } from '$lib/supabase';
import { parseBody, isUserMemberOfMellowServer } from '$lib/util';

const PATCH_PAYLOAD = z.object({
	channel_id: DISCORD_SNOWFLAKE.nullish(),
	event_kinds: z.number().int().nullish()
});
export async function PATCH({ locals: { getSession }, params: { id }, request }) {
	const session = await getSession();
	if (!await isUserMemberOfMellowServer(session.sub, id))
		throw error(403, 'no_permission');

	const body = await parseBody(request, PATCH_PAYLOAD);
	handleResponse(
		await header(supabase.from('mellow_servers')
			.update({
				logging_types: body.event_kinds,
				logging_channel_id: body.channel_id
			}),
			'x-actionee-id', session.sub
		)
		.eq('id', id)
	);

	return new Response();
}