import { z } from 'zod';
import { json } from '@sveltejs/kit';

import { error } from '$lib/response';
import { TeamRolePermission } from '$lib/enums';
import supabase, { handleResponse } from '$lib/supabase';
import { parseQuery, hasTeamPermissions } from '$lib/util';

const QUERY_SCHEMA = z.object({
	limit: z.coerce.number().int().default(20),
	offset: z.coerce.number().int().default(0)
});
export async function GET({ locals: { getSession }, params: { id }, request }) {
	const session = await getSession();
	if (!await hasTeamPermissions(id, session.sub, [TeamRolePermission.ManageTeam]))
		throw error(403, 'no_permission');

	const { limit, offset } = await parseQuery(request, QUERY_SCHEMA);

	const response = await supabase.from('team_audit_logs')
		.select('id, type, data, author:users!team_audit_logs_author_id_fkey ( id, name, username, avatar_url ), created_at, target_user:users!team_audit_logs_target_user_id_fkey ( name, username ), target_team_role:team_roles!team_audit_logs_target_role_id_fkey ( id, name )')
		.eq('team_id', id)
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