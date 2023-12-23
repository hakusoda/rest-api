import { z } from 'zod';

import { error } from '$lib/response';
import { TeamRolePermission } from '$lib/enums';
import supabase, { handleResponse } from '$lib/supabase';
import { parseBody, createTeamAuditLog, hasTeamPermissions } from '$lib/util';

const PATCH_BODY = z.object({
	name: z.string().min(1).max(20).optional(),
	position: z.number().int().min(0).max(256).optional(),
	permissions: z.number().int().optional()
});
export async function PATCH({ locals: { getSession }, params: { id, role_id }, request }) {
	const session = await getSession();
	const member = await hasTeamPermissions(id, session.sub, [TeamRolePermission.ManageRoles]);
	if (member === null)
		throw error(403, 'not_in_team');
	else if (!member)
		throw error(403, 'missing_permissions');

	const response = await supabase.from('team_roles')
		.select('name, position, permissions')
		.eq('id', role_id)
		.eq('team_id', id)
		.limit(1)
		.maybeSingle();
	handleResponse(response);

	if (!response.data)
		throw error(404, 'not_found');

	if (session.sub !== member.team.owner_id && member.role && member.role.position <= response.data.position)
		throw error(403, 'missing_permissions_for_target');	

	const body = await parseBody(request, PATCH_BODY);
	const response2 = await supabase.from('team_roles')
		.update(body)
		.eq('id', role_id)
		.eq('team_id', id);
	handleResponse(response2);

	await createTeamAuditLog('team.role.updated', session.sub, id, {
		name: [response.data.name, body.name],
		position: [response.data.position, body.position],
		permissions: [response.data.permissions, body.permissions]
	}, role_id);

	return new Response();
}