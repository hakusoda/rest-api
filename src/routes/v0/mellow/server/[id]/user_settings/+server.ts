import { z } from 'zod';

import { parseBody } from '$lib/util';
import supabase, { handleResponse } from '$lib/supabase';

const PATCH_PAYLOAD = z.object({
	user_connections: z.array(z.object({
		id: z.string().uuid()
	})).max(5)
});
export async function PATCH({ locals: { getSession }, params: { id }, request }) {
	const session = await getSession();

	const body = await parseBody(request, PATCH_PAYLOAD);
	const response = handleResponse(await supabase.from('user_connections')
		.select('id,sub,type')
		.eq('user_id', session.sub)
	);
	const filtered_connections = body.user_connections.filter(item => response.data!.some(i => i.id === item.id));
	handleResponse(await supabase.from('mellow_user_server_settings')
		.upsert({
			user_id: session.sub,
			server_id: id,
			user_connections: filtered_connections.filter((item, index) => filtered_connections.findIndex(i => i.id === item.id) === index)
		}, { onConflict: 'user_id,server_id' })
	);

	return new Response();
}