import { z } from 'zod';

import handler from '../../../lib/handler';
import { supabase } from '../../../lib/supabase';
import { getRequestingUser } from '../../../lib/database';
import { TeamRolePermission } from '../../../lib/enums';
import { json, error, status } from '../../../lib/response';

export const runtime = 'edge';
export const POST = handler(async ({ body, headers }) => {
	const user = await getRequestingUser(headers);
	if (!user)
		return error(401, 'unauthorised');

	const response = await supabase.from('teams').insert({
		name: body.display_name.toLowerCase().replace(/ /g, '_').replace(/\W/g, ''),
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
		permissions: TeamRolePermission.ManageTeam + TeamRolePermission.InviteUsers
	}, {
		name: 'Owner',
		team_id: response.data.id,
		position: 2,
		permissions: 0
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
	
	return json(response.data);
}, z.object({
	display_name: z.string().min(3).max(20)
}));

export const OPTIONS = () => status(200);