import { z } from 'zod';

import { error } from '$lib/response';
import supabase, { handleResponse } from '$lib/supabase';
import { parseBody, createMellowServerAuditLog, isUserMemberOfMellowServer } from '$lib/util';

const PATCH_PAYLOAD = z.object({
	name: z.string().min(1).max(24).optional(),
	events: z.number().int().min(0).optional(),
	enabled: z.boolean().optional(),
	target_url: z.string().url().min(10).max(64).startsWith('https://').optional()
});
export async function PATCH({ locals: { getSession }, params: { id, webhook_id }, request }) {
	const session = await getSession();
	if (!await isUserMemberOfMellowServer(session.sub, id))
		throw error(403, 'no_permission');

	const response = await supabase.from('mellow_server_webhooks')
		.select('name, events, enabled, target_url')
		.eq('id', webhook_id)
		.eq('server_id', id)
		.limit(1)
		.single();
	handleResponse(response);

	const body = await parseBody(request, PATCH_PAYLOAD);
	const response2 = await supabase.from('mellow_server_webhooks')
		.update(body)
		.eq('id', webhook_id)
		.eq('server_id', id);
	handleResponse(response2);

	await createMellowServerAuditLog('mellow.server.webhook.updated', session.sub, id, {
		name: [response.data!.name, body.name],
		events: [response.data!.events, body.events],
		enabled: [response.data!.enabled, body.enabled],
		target_url: [response.data!.target_url, body.target_url]
	});

	return new Response();
}

export async function DELETE({ locals: { getSession }, params: { id, webhook_id } }) {
	const session = await getSession();
	if (!await isUserMemberOfMellowServer(session.sub, id))
		throw error(403, 'no_permission');

	const response = await supabase.from('mellow_server_webhooks')
		.delete()
		.eq('id', webhook_id)
		.eq('server_id', id)
		.select('name');
	handleResponse(response);

	await createMellowServerAuditLog('mellow.server.webhook.deleted', session.sub, id, {
		name: response.data![0].name
	});

	return new Response();
}