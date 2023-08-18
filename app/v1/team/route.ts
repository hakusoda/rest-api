import { z } from 'zod';

import handler from '../../../lib/handler';
import { supabase } from '../../../lib/supabase';
import { getRequestingUser, createTeamAuditLog } from '../../../lib/database';
import { TeamAuditLogType, TeamRolePermission } from '../../../lib/enums';
import { json, error, status } from '../../../lib/response';

export const runtime = 'edge';
export const POST = handler(async ({ body, headers }) => {
	const user = await getRequestingUser(headers);
	if (!user)
		return error(401, 'unauthorised');

	const name = body.display_name.toLowerCase().replace(/ /g, '_').replace(/\W/g, '');
	const response = await supabase.from('teams').insert({
		name,
		owner_id: user.id,
		creator_id: user.id,
		display_name: body.display_name
	}).select('id, name').limit(1).single();
	if (response.error) {
		if (response.error.details.startsWith('Key (name)='))
			return error(400, 'team_exists');

		console.error(response.error);
		return error(500, 'database_error');
	}

	const response2 = await supabase.from('team_roles').insert([{
		name: 'Member',
		team_id: response.data.id,
		position: 0,
		permissions: 0
	}, {
		name: 'Administrator',
		team_id: response.data.id,
		position: 1,
		permissions: TeamRolePermission.ManageTeam + TeamRolePermission.ManageMembers + TeamRolePermission.InviteUsers
	}, {
		name: 'Owner',
		team_id: response.data.id,
		position: 2,
		permissions: TeamRolePermission.Administrator
	}]).select('id');
	if (response2.error) {
		console.error(response2.error);
		return error(500, 'database_error');
	}

	const response3 = await supabase.from('team_members').insert({
		user_id: user.id,
		team_id: response.data.id,
		role_id: response2.data[2].id
	});
	if (response3.error) {
		console.error(response3.error);
		return error(500, 'database_error');
	}
	
	await createTeamAuditLog(TeamAuditLogType.CreateTeam, user.id, response.data.id, {
		name,
		display_name: body.display_name
	});

	return json(response.data);
}, z.object({
	display_name: z.string().min(3).max(20)
}));

export const OPTIONS = () => status(200);