import { z } from 'zod';

import { parseBody } from '$lib/util';
import { MELLOW_API_KEY } from '$env/static/private';
import { UserConnectionType } from '$lib/enums.js';
import supabase, { handleResponse } from '$lib/supabase';

const PATCH_PAYLOAD = z.object({
	connections: z.array(z.object({
		id: z.string().uuid()
	}))
});
export const PATCH = async ({ locals: { getSession }, params: { id }, request }) => {
	const session = await getSession();

	const body = await parseBody(request, PATCH_PAYLOAD);
	handleResponse(await supabase.from('mellow_user_server_connections')
		.delete()
		.eq('user_id', session.sub)
		.eq('server_id', id)
		.not('connection_id', 'in', `(${body.connections.map(item => item.id).join(',')})`)
	);

	if (body.connections.length) {
		handleResponse(await supabase.from('mellow_user_server_connections')
			.insert(body.connections.map(item => ({
				user_id: session.sub,
				server_id: id,
				connection_id: item.id
			})))
		);
	}

	const response = handleResponse(await supabase.from('user_connections')
		.select('sub')
		.eq('type', UserConnectionType.Discord)
		.eq('user_id', session.sub)
		.limit(1)
		.maybeSingle()
	);
	await fetch(`https://mellow-internal-api.hakumi.cafe/server/${id}/member/${response.data!.sub}/sync`, {
		body: '{"is_sign_up":true}',
		method: 'POST',
		headers: {
			'x-api-key': MELLOW_API_KEY,
			'content-type': 'application/json'
		}
	});

	return new Response();
}