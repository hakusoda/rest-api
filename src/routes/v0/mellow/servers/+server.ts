import { json } from '@sveltejs/kit';

import supabase, { handleResponse } from '$lib/supabase';
export async function GET({ locals: { getSession }}) {
	const session = await getSession(true);
	const response = await supabase.rpc('website_get_user_mellow_servers', {
		target_user_id: session!.sub
	});
	handleResponse(response);

	return json((response.data as Server[])
		.map(item => ({
			id: item.id,
			name: item.name,
			owner: item.owner_team_name ? {
				kind: 'team',
				name: item.owner_team_name
			}: {
				kind: 'user',
				name: item.owner_user_name,
				username: item.owner_user_username
			},
			avatar_url: item.avatar_url
		}))
		.sort((a, b) => a.name.localeCompare(b.name))
	);
}

interface Server {
	id: string
	name: string
	avatar_url: string
	owner_team_name: string
	owner_user_name: string
	owner_user_username: string
}