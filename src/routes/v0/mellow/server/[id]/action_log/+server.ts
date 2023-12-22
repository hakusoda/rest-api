import { z } from 'zod';
import { json } from '@sveltejs/kit';

import { error } from '$lib/response';
import supabase, { handleResponse } from '$lib/supabase';
import { parseQuery, isUserMemberOfMellowServer } from '$lib/util';

const QUERY_SCHEMA = z.object({
	limit: z.coerce.number().int().default(20),
	offset: z.coerce.number().int().default(0)
});
export async function GET({ locals: { getSession }, params: { id }, request }) {
	const session = await getSession();
	if (isNaN(parseInt(id)))
		throw error(400, 'invalid_id');

	if (!await isUserMemberOfMellowServer(session.sub, id))
		throw error(403, 'no_permission');

	const { limit, offset } = await parseQuery(request, QUERY_SCHEMA);

	const response = await supabase.from('mellow_server_audit_logs')
		.select('id, type, data, author:users( id, name, username, avatar_url ), created_at, target_action:mellow_binds ( id, name )', { count: 'planned' })
		.eq('server_id', id)
		.order('created_at', { ascending: false })
		.range(offset, offset + Math.min(Math.max(limit, 0), 100) - 1);
	handleResponse(response);

	return json({
		limit,
		offset,
		results: response.data,
		total_results: response.count
	});
}