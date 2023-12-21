import { z } from 'zod';

import { error } from '$lib/response';
import type { RequestHandler } from './$types';
import supabase, { handleResponse } from '$lib/supabase';
import { TeamAuditLogType, TeamRolePermission } from '$lib/enums';
import { hasBit, parseBody, createTeamAuditLog } from '$lib/util';

const PATCH_BODY = z.object({
	name: z.string().min(1).max(20).optional(),
	position: z.number().int().min(0).max(256).optional(),
	permissions: z.number().int().optional()
});
export const PATCH = (async ({ locals: { getSession }, params: { id, role_id }, request }) => {
	const session = await getSession();
	const member = await getMember(id, session.sub);
	if (!member || (session.sub !== member.team.owner_id && (!member.role || !hasBit(member.role.permissions, TeamRolePermission.ManageRoles))))
		throw error(403, 'no_permission');

	const response = await supabase.from('team_roles')
		.select('name, position, permissions')
		.eq('id', role_id)
		.eq('team_id', id)
		.limit(1)
		.maybeSingle();
	handleResponse(response);

	if (!response.data)
		throw error(404, 'not_found');

	if (member.role && session.sub !== member.team.owner_id && member.role.position <= response.data.position)
		throw error(500, 'no_permission');	

	const body = await parseBody(request, PATCH_BODY);
	const response2 = await supabase.from('team_roles')
		.update(body)
		.eq('id', role_id)
		.eq('team_id', id);
	handleResponse(response2);

	await createTeamAuditLog(TeamAuditLogType.UpdateRole, session.sub, id, {
		name: [response.data.name, body.name],
		position: [response.data.position, body.position],
		permissions: [response.data.permissions, body.permissions]
	});

	return new Response();
}) satisfies RequestHandler;


async function getMember(teamId: string, userId: string) {
	const response = await supabase.from('team_members')
		.select<string, {
			team: {
				owner_id: string | null
			}
			role: {
				position: number
				permissions: number
			} | null
		}>('team:teams ( owner_id ), role:team_roles ( position, permissions )')
		.eq('user_id', userId)
		.eq('team_id', teamId)
		.limit(1)
		.maybeSingle();
	handleResponse(response);

	return response.data;
}