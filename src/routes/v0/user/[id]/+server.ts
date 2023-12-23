import { json } from '@sveltejs/kit';

import { error } from '$lib/response';
import { isUUID } from '$lib/util';
import supabase, { handleResponse } from '$lib/supabase';
export async function GET({ params: { id } }) {
	const response = await supabase.from('users')
		.select('id, name, flags, teams:team_members!team_members_user_id_fkey ( role:team_roles ( id, name, position, permissions ), teams ( id, name, owner:users!teams_owner_id_fkey ( id, name, flags, username, avatar_url, created_at ), avatar_url, created_at, display_name, member_count:team_members ( count ) ) ), username, avatar_url, created_at')
		.eq(isUUID(id) ? 'id': 'username', id)
		.limit(1)
		.maybeSingle();
	handleResponse(response);

	if (!response.data)
		throw error(404, 'not_found');

	return json({
		...response.data,
		teams: response.data.teams.map(team => ({
			...team.teams,
			role: team.role,
			member_count: (team.teams as any as typeof team.teams[number]).member_count[0].count
		}))
	});
}