import { z } from 'zod';

import handler from '../../../../../../lib/handler';
import { hasBit } from '../../../../../../lib/util';
import { supabase } from '../../../../../../lib/supabase';
import { error, status } from '../../../../../../lib/response';
import { getRequestingUser } from '../../../../../../lib/database';
import { TeamRolePermission } from '../../../../../../lib/enums';

export const runtime = 'edge';
export const PATCH = handler(async ({ body, query, headers }) => {
	if (!body.name && body.position === undefined && body.permissions === undefined)
		return error(400, 'invalid_body');

	const user = await getRequestingUser(headers);
	if (!user)
		return error(401, 'unauthorised');

	const member = await getMember(query.id, user.id);
	if (!member)
		return error(403, 'no_permission');
	if (member instanceof Response)
		return member;

	if (user.id !== member.team.owner_id && (!member.role || !hasBit(member.role.permissions, TeamRolePermission.ManageRoles)))
		return error(403, 'no_permission');

	const response = await supabase.from('team_roles').select('position')
		.eq('id', query.role_id)
		.eq('team_id', query.id)
		.limit(1)
		.maybeSingle();
	if (response.error) {
		console.error(response.error);
		return error(500, 'database_error');
	}

	if (!response.data)
		return error(404, 'not_found');

	if (member.role && user.id !== member.team.owner_id && member.role.position <= response.data.position)
		return error(500, 'no_permission_target_role');

	const response2 = await supabase.from('team_roles').update(body)
		.eq('id', query.role_id)
		.eq('team_id', query.id);
	if (response2.error) {
		console.error(response2.error);
		return error(500, 'database_error');
	}

	return status(200);
}, z.object({
	name: z.string().min(1).max(20).optional(),
	position: z.number().int().min(0).max(256).optional(),
	permissions: z.number().int().optional()
}));
export const OPTIONS = () => status(200);

async function getMember(teamId: string, userId: string) {
	const response = await supabase.from('team_members').select<string, {
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
	if (response.error) {
		console.error(response.error);
		return error(500, 'database_error');
	}

	return response.data;
}