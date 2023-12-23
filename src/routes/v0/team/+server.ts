import { z } from 'zod';
import { json } from '@sveltejs/kit';

import { error } from '$lib/response';
import supabase, { handleResponse } from '$lib/supabase';
import { ApiFeatureFlag, TeamRolePermission } from '$lib/enums';
import { parseBody, createTeamAuditLog, throwIfFeatureNotEnabled } from '$lib/util';
const POST_BODY = z.object({
	display_name: z.string().min(3).max(20)
});
export async function POST({ locals: { getSession }, request }) {
	await throwIfFeatureNotEnabled(ApiFeatureFlag.TeamCreation);

	const session = await getSession();
	const body = await parseBody(request, POST_BODY);

	const name = body.display_name.toLowerCase().replace(/ /g, '_').replace(/\W/g, '');
	const response = await supabase.from('teams')
		.insert({
			name,
			owner_id: session.sub,
			creator_id: session.sub,
			...body
		})
		.select('id, name, display_name')
		.limit(1)
		.single();
	if (response.error) {
		if (response.error.details.startsWith('Key (name)='))
			throw error(400, 'team_exists');

		console.error(response.error);
		throw error(500, 'database_error');
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
		permissions: TeamRolePermission.Administrator
	}, {
		name: 'Owner',
		team_id: response.data.id,
		position: 2,
		permissions: TeamRolePermission.Administrator
	}]).select('id');
	handleResponse(response2);

	const response3 = await supabase.from('team_members').insert({
		user_id: session.sub,
		team_id: response.data.id,
		role_id: response2.data![2].id
	});
	handleResponse(response3);

	await createTeamAuditLog('team.created', session.sub, response.data.id, {
		name,
		display_name: body.display_name
	});

	return json(response.data);
}