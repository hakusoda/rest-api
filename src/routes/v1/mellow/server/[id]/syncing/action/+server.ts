import { json } from '@sveltejs/kit';

import { error } from '$lib/response';
import type { RequestHandler } from './$types';
import { MellowServerAuditLogType } from '$lib/enums';
import supabase, { handleResponse } from '$lib/supabase';
import { MELLOW_SERVER_PROFILE_SYNC_ACTION_PAYLOAD } from '$lib/constants';
import { parseBody, createMellowServerAuditLog, isUserMemberOfMellowServer } from '$lib/util';
export const POST = (async ({ locals: { getSession }, params: { id }, request }) => {
	const session = await getSession();
	if (isNaN(parseInt(id)))
		throw error(400, 'invalid_id');

	if (!await isUserMemberOfMellowServer(session.sub, id))
		throw error(403, 'no_permission');

	const body = await parseBody(request, MELLOW_SERVER_PROFILE_SYNC_ACTION_PAYLOAD);
	const response = await supabase.from('mellow_binds')
		.insert({
			name: body.name,
			type: body.type,
			metadata: body.metadata,
			server_id: id,
			creator_id: session.sub,
			requirements_type: body.requirements_type
		})
		.select('id, name, type, data, creator:users ( name, username ), created_at, requirements_type')
		.limit(1)
		.single();
	handleResponse(response);

	let requirements: any[] = [];
	if (body.requirements.length) {
		const response2 = await supabase.from('mellow_bind_requirements').insert(body.requirements.map(item => ({
			type: item.type,
			data: item.data,
			bind_id: response.data!.id
		}))).select('id, type, data');
		handleResponse(response2);

		requirements = response2.data!;
	}
	
	await createMellowServerAuditLog(MellowServerAuditLogType.CreateProfileSyncAction, session.sub, id, {
		name: body.name,
		type: body.type,
		metadata: body.metadata,
		requirements: body.requirements.length,
		requirements_type: body.requirements_type
	}, response.data!.id);

	return json({
		...response.data,
		requirements
	});
}) satisfies RequestHandler;
