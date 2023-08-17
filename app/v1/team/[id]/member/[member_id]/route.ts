import { z } from 'zod';

import handler from '../../../../../../lib/handler';
import { supabase } from '../../../../../../lib/supabase';
import { error, status } from '../../../../../../lib/response';
import { getRequestingUser } from '../../../../../../lib/database';
import { hasTeamPermissions } from '../../../../../../lib/util';
import { TeamRolePermission } from '../../../../../../lib/enums';

export const runtime = 'edge';
export const PATCH = handler(async ({ body, query, headers }) => {
	const user = await getRequestingUser(headers);
	if (!user)
		return error(401, 'unauthorised');

	if (!await hasTeamPermissions(query.id, user.id, [TeamRolePermission.ManageMembers]))
		return error(403, 'no_permission');

	if (body.role_id) {
		const response = await supabase.from('team_roles').select('id')
			.eq('id', body.role_id)
			.eq('team_id', query.id)
			.limit(1)
			.maybeSingle();
		if (response.error) {
			console.error(response.error);
			return error(500, 'database_error');
		}

		if (!response.data)	
			return error(400, 'invalid_role');
	}

	const response2 = await supabase.from('team_members').update(body)
		.eq('user_id', query.member_id)
		.eq('team_id', query.id);
	if (response2.error) {
		console.error(response2.error);
		return error(500, 'database_error');
	}

	return status(200);
}, z.object({
	role_id: z.string().uuid().nullable()
}));
export const OPTIONS = () => status(200);