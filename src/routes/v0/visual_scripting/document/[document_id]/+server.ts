import { error } from '$lib/response';
import { Document } from '$lib/schemas/visual_scripting';
import supabase, { handleResponse } from '$lib/supabase';
import { parseBody, createMellowServerAuditLog, isUserMemberOfMellowServer } from '$lib/util';

const only_once_kinds = ['action.mellow.member.ban', 'action.mellow.member.kick', 'action.mellow.member.sync'];
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

const PATCH_PAYLOAD = Document;
export async function PATCH({ locals: { getSession }, params: { document_id }, request }) {
	const session = await getSession();
	const document = handleResponse(await supabase.from('visual_scripting_documents')
		.select('definition, mellow_server_id')
		.eq('id', document_id)
		.limit(1)
		.maybeSingle()
	).data;
	if (!document)
		throw error(404, 'document_not_found');

	if (!document.mellow_server_id || !await isUserMemberOfMellowServer(session.sub, document.mellow_server_id))
		throw error(403, 'no_permission');

	const payload = await parseBody(request, PATCH_PAYLOAD);
	if (!validate_event_response_tree(payload.definition))
		throw error(400, 'invalid_body');

	handleResponse(await supabase.from('visual_scripting_documents')
		.update(payload)
		.eq('id', document_id)
	);
	
	await createMellowServerAuditLog('mellow.server.visual_scripting.document.updated', session.sub, document.mellow_server_id, {
		definition: [document.definition, payload.definition]
	}, undefined, undefined, document_id);

	return new Response();
}