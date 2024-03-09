import { z } from 'zod';

import { error } from '$lib/response';
import supabase, { handleResponse } from '$lib/supabase';
import { parseBody, createMellowServerAuditLog, isUserMemberOfMellowServer } from '$lib/util';

const event_response_statement_input = z.object({
	kind: z.enum(['match']),
	value: z.any()
}).or(z.object({
	kind: z.enum(['variable']),
	value: z.string().max(32)
}));

const event_response_item: z.ZodType<any> = z.object({
	kind: z.enum(['action.mellow.sync_profile', 'action.mellow.member.kick'])
}).or(z.object({
	kind: z.enum(['statement.if']),
	blocks: z.array(z.object({
		items: z.array(z.lazy(() => event_response_item)).max(4),
		condition: z.object({
			kind: z.enum(['generic.is', 'generic.is_not']),
			inputs: z.array(event_response_statement_input)
		}).optional()
	})).max(1)
}));

const only_once_kinds = ['action.mellow.sync_profile', 'action.mellow.member.kick'];
function validate_event_response_tree(items: any[]): boolean {
	const oncelers: string[] = [];
	for (const item of items) {
		const is_onceler = only_once_kinds.includes(item.kind);
		if (is_onceler) {
			if (oncelers.includes(item.kind))
				return false;
			else
				oncelers.push(item.kind);
		}

		if (item.kind === 'statement.if')
			for (const block of item.blocks)
				if (!validate_event_response_tree(block.items))
					return false;
	}

	return true;
}

const events = ['member_join'];
const PATCH_PAYLOAD = z.array(event_response_item).max(4);
export async function PATCH({ locals: { getSession }, params: { id, event_name }, request }) {
	const session = await getSession();
	if (isNaN(parseInt(id)))
		throw error(400, 'invalid_id');

	if (!await isUserMemberOfMellowServer(session.sub, id))
		throw error(403, 'no_permission');

	if (!events.includes(event_name))
		throw error(404, 'event_not_found');

	const body = await parseBody(request, PATCH_PAYLOAD);
	if (!validate_event_response_tree(body))
		throw error(400, 'invalid_body');

	const response = await supabase.from('mellow_servers')
		.update({ [`${event_name}_event_response_tree`]: body })
		.eq('id', id);
	handleResponse(response);
	
	// TODO: add diff to audit log
	await createMellowServerAuditLog('mellow.server.automation.event.updated', session.sub, id, {
		event_name
	});

	return new Response();
}