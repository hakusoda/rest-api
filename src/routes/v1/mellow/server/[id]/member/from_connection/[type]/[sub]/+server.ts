import { json } from '@sveltejs/kit';

import { UserConnectionType } from '$lib/enums';
import supabase, { handleResponse } from '$lib/supabase';
export async function GET({ locals: { getMellowServer }, params: { id, sub, type } }) {
	await getMellowServer();

	const response = await supabase.from('mellow_user_server_connections')
		.select('a:user_connections!inner ( sub, type, user:users ( id, name, username, avatar_url ), b:users ( c:user_connections ( sub ) ) )')
		.eq('server_id', id)
		.eq('a.b.c.type', UserConnectionType.Discord)
		.eq('a.sub', sub)
		.eq('a.type', type)
		.limit(1)
		.single()
	handleResponse(response);

	return json({
		user: response.data!.a.user,
		discord_id: response.data!.a.b.c[0].sub
	});
}