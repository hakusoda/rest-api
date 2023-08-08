import { z } from 'zod';

import handler from '../../../../lib/handler';
import { supabase } from '../../../../lib/supabase';
import { TeamRolePermission } from '../../../../lib/enums';
import { json, error, status } from '../../../../lib/response';
import { isUUID, hasTeamPermissions } from '../../../../lib/util';
import { getTeam, getRequestingUser } from '../../../../lib/database';

export const runtime = 'edge';
export const GET = handler(async ({ query }) => {
	const team = await getTeam(query.id);
	if (!team)
		return status(404);

	return json(team, 200, 300);
});
export const PATCH = handler(async ({ body, query, headers }) => {
	const user = await getRequestingUser(headers);
	if (!user)
		return error(401, 'unauthorised');

	if (!body.name && !body.display_name)
		return error(400, 'invalid_body');
	
	if (!await hasTeamPermissions(query.id, user.id, [TeamRolePermission.ManageTeam]))
		return error(403, 'no_permission');

	const response = await supabase.from('teams').update({
		name: body.name,
		display_name: body.display_name
	}).eq(isUUID(query.id) ? 'id' : 'name', query.id);
	if (response.error) {
		console.error(response.error);
		return error(500, 'database_error');
	}

	return status(200);
}, z.object({
	name: z.string().min(3).max(20).regex(/^\w+$/).optional(),
	display_name: z.string().min(3).max(20).optional()
}));
export const OPTIONS = () => status(200);