import { z } from 'zod';

import handler from '../../../../../lib/handler';
import { supabase } from '../../../../../lib/supabase';
import { error, status } from '../../../../../lib/response';
import { getRequestingUser } from '../../../../../lib/database';
import { hasTeamPermissions } from '../../../../../lib/util';
import { TeamRolePermission } from '../../../../../lib/enums';

export const runtime = 'edge';
export const POST = handler(async ({ body, query, headers }) => {
	const user = await getRequestingUser(headers);
	if (!user)
		return error(401, 'unauthorised');

	if (!await hasTeamPermissions(query.id, user.id, [TeamRolePermission.InviteUsers]))
		return error(403, 'no_permission');

	const response = await supabase.from('team_invites').upsert({
		user_id: body.user_id,
		team_id: query.id,
		author_id: user.id
	});
	if (response.error) {
		console.error(response.error);
		return error(500, 'database_error');
	}
	
	return status(200);
}, z.object({
	user_id: z.string().uuid()
}));

export const OPTIONS = () => status(200);