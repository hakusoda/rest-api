import { z } from 'zod';

import handler from '../../../../../lib/handler';
import { supabase } from '../../../../../lib/supabase';
import { error, status } from '../../../../../lib/response';
import { hasTeamPermissions } from '../../../../../lib/util';
import { TeamAuditLogType, TeamRolePermission } from '../../../../../lib/enums';
import { getRequestingUser, createTeamAuditLog } from '../../../../../lib/database';

export const runtime = 'edge';
export const POST = handler(async ({ body, query, headers }) => {
	const user = await getRequestingUser(headers);
	if (!user)
		return error(401, 'unauthorised');

	if (!await hasTeamPermissions(query.id, user.id, [TeamRolePermission.InviteUsers]))
		return error(403, 'no_permission');

	const response = await supabase.from('team_invites').upsert({
		team_id: query.id,
		user_id: body.user_id,
		author_id: user.id
	});
	if (response.error) {
		console.error(response.error);
		return error(500, 'database_error');
	}

	await createTeamAuditLog(TeamAuditLogType.InviteUser, user.id, query.id, undefined, undefined, body.user_id);
	
	return status(200);
}, z.object({
	user_id: z.string().uuid()
}));

export const OPTIONS = () => status(200);