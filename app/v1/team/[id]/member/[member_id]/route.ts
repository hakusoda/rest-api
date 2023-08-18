import { z } from 'zod';

import handler from '../../../../../../lib/handler';
import { supabase } from '../../../../../../lib/supabase';
import { error, status } from '../../../../../../lib/response';
import { hasTeamPermissions } from '../../../../../../lib/util';
import { TeamAuditLogType, TeamRolePermission } from '../../../../../../lib/enums';
import { getRequestingUser, createTeamAuditLog } from '../../../../../../lib/database';

export const runtime = 'edge';
export const PATCH = handler(async ({ body, query, headers }) => {
	const user = await getRequestingUser(headers);
	if (!user)
		return error(401, 'unauthorised');

	if (!await hasTeamPermissions(query.id, user.id, [TeamRolePermission.ManageMembers]))
		return error(403, 'no_permission');

	const response = await supabase.from('team_members').select('role_id')
		.eq('team_id', query.id)
		.eq('user_id', query.member_id)
		.limit(1)
		.maybeSingle();
	if (response.error) {
		console.error(response.error);
		return error(500, 'database_error');
	}

	if (!response.data)
		return error(404, 'not_found');

	if (body.role_id) {
		const response2 = await supabase.from('team_roles').select('id')
			.eq('id', body.role_id)
			.eq('team_id', query.id)
			.limit(1)
			.maybeSingle();
		if (response2.error) {
			console.error(response.error);
			return error(500, 'database_error');
		}

		if (!response2.data)	
			return error(400, 'invalid_role');
	}

	const response3 = await supabase.from('team_members').update(body)
		.eq('user_id', query.member_id)
		.eq('team_id', query.id);
	if (response3.error) {
		console.error(response3.error);
		return error(500, 'database_error');
	}

	await createTeamAuditLog(TeamAuditLogType.UpdateMember, user.id, query.id, {
		role_id: [response.data.role_id, body.role_id]
	});

	return status(200);
}, z.object({
	role_id: z.string().uuid().nullable()
}));
export const OPTIONS = () => status(200);