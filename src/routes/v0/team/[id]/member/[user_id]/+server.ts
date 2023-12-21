import { z } from 'zod';

import { error } from '$lib/response';
import type { RequestHandler } from './$types';
import supabase, { handleResponse } from '$lib/supabase';
import { TeamAuditLogType, TeamRolePermission } from '$lib/enums';
import { parseBody, createTeamAuditLog, hasTeamPermissions } from '$lib/util';

const PATCH_BODY = z.object({
	role_id: z.string().uuid().nullable()
});
export const PATCH = (async ({ locals: { getSession }, params: { id, user_id }, request }) => {
	const session = await getSession();
	if (!await hasTeamPermissions(id, session.sub, [TeamRolePermission.ManageMembers]))
		throw error(403, 'no_permission');

	const response = await supabase.from('team_members').select('role_id')
		.eq('team_id', id)
		.eq('user_id', user_id)
		.limit(1)
		.maybeSingle();
	handleResponse(response);

	if (!response.data)
		throw error(404, 'not_found');

	const body = await parseBody(request, PATCH_BODY);
	if (body.role_id) {
		const response2 = await supabase.from('team_roles')
			.select('id')
			.eq('id', body.role_id)
			.eq('team_id', id)
			.limit(1)
			.maybeSingle();
		handleResponse(response2);

		if (!response2.data)	
			throw error(400, 'invalid_role');
	}

	const response3 = await supabase.from('team_members')
		.update(body)
		.eq('team_id', id)
		.eq('user_id', user_id);
	handleResponse(response3);

	await createTeamAuditLog(TeamAuditLogType.UpdateMember, session.sub, id, {
		role_id: [response.data.role_id, body.role_id]
	});

	return new Response();
}) satisfies RequestHandler;
