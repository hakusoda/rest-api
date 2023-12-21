import base64 from '@hexagon/base64';
import { json } from '@sveltejs/kit';

import { error } from '$lib/response';
import supabase, { handleResponse } from '$lib/supabase';
import { getMellowServerApiEncryptionKey } from '$lib/constants';
import { createMellowServerAuditLog, isUserMemberOfMellowServer } from '$lib/util';
export async function POST({ locals: { getSession }, params: { id } }) {
	const session = await getSession();
	if (isNaN(parseInt(id)))
		throw error(400, 'invalid_id');

	if (!await isUserMemberOfMellowServer(session.sub, id))
		throw error(403, 'no_permission');

	const api_key_created_at = new Date().toISOString();

	const iv = crypto.getRandomValues(new Uint8Array(96));
	const api_key = await crypto.subtle.encrypt(
		{ iv, name: 'AES-GCM' },
		await getMellowServerApiEncryptionKey(),
		new TextEncoder().encode(`${id}\u0143${api_key_created_at}`)
	);

	const response = await supabase.from('mellow_servers')
		.update({ api_key_created_at })
		.eq('id', id);
	handleResponse(response);
	
	await createMellowServerAuditLog('mellow.server.api_key.created', session.sub, id);

	return json({
		api_key: `${base64.fromArrayBuffer(api_key, false)}-${base64.fromArrayBuffer(iv, false)}`
	});
}