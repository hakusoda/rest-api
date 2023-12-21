import { json } from '@sveltejs/kit';

import { UserConnectionType } from '$lib/enums';
import supabase, { handleResponse } from '$lib/supabase';
export async function GET({ locals: { getMellowServer }, params: { id, member_id } }) {
	await getMellowServer();

	const response = await supabase.from('user_connections')
		.select('user:users ( id, name, username, avatar_url ), c:users ( connections:mellow_user_server_connections ( connection:user_connections ( sub, type ) ) )')
		.eq('sub', member_id)
		.eq('type', UserConnectionType.Discord)
		.eq('c.connections.server_id', id)
		.limit(1)
		.single()
	handleResponse(response);

	return json({
		user: response.data!.user,
		discord_id: member_id,
		connections: response.data!.c.connections.map(item => item.connection)
	});
}