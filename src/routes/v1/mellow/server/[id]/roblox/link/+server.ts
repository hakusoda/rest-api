import { json } from '@sveltejs/kit';
import type { ZodIssue } from 'zod';

import { error } from '$lib/response';
import type { RequestHandler } from './$types';
import supabase, { handleResponse } from '$lib/supabase';
import { MELLOW_SERVER_PROFILE_SYNC_ACTION_PAYLOAD } from '$lib/constants';
import { MellowServerAuditLogType, MellowProfileSyncActionRequirementType } from '$lib/enums';
import { parseBody, createMellowServerAuditLog, isUserMemberOfMellowServer } from '$lib/util';
export const POST = (async ({ locals: { getSession }, params: { id }, request }) => {
	const session = await getSession();
	if (isNaN(parseInt(id)))
		throw error(400, 'invalid_id');

	if (!await isUserMemberOfMellowServer(session.sub, id))
		throw error(403, 'no_permission');

	const body = await parseBody(request, MELLOW_SERVER_PROFILE_SYNC_ACTION_PAYLOAD);
	const issues: ZodIssue[] = [];
	for (const [index, { type, data: rData }] of Object.entries(body.requirements)) {
		if (type === MellowProfileSyncActionRequirementType.RobloxHasGroupRole || type === MellowProfileSyncActionRequirementType.RobloxHasGroupRankInRange) {
			if (!isFinite(+rData[0]))
				issues.push({
					code: 'custom',
					path: ['requirements', index, 'data', 0],
					message: ''
				});
		}

		if (type === MellowProfileSyncActionRequirementType.RobloxHasGroupRole) {
			if (!isFinite(+rData[1]))
				issues.push({
					code: 'custom',
					path: ['requirements', index, 'data', 1],
					message: ''
				});
		} else if (type === MellowProfileSyncActionRequirementType.RobloxHasGroupRankInRange) {
			const [_, min, max] = rData;
			if (!min || !isFinite(+min) || +min <= 0)
				issues.push({
					code: 'custom',
					path: ['requirements', index, 'data', 1],
					message: ''
				});
			if (!max || !isFinite(+max) || +max > 255)
				issues.push({
					code: 'custom',
					path: ['requirements', index, 'data', 2],
					message: ''
				});
		}
	}

	if (issues.length)
		throw error(400, 'invalid_body', issues);

	const response = await supabase.from('mellow_binds')
		.insert({
			name: body.name,
			type: body.type,
			data: body.data,
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
	
	await createMellowServerAuditLog(MellowServerAuditLogType.CreateRobloxLink, session.sub, id, {
		name: body.name,
		type: body.type,
		data: body.data,
		requirements: body.requirements.length,
		requirements_type: body.requirements_type
	}, response.data!.id);

	return json({
		...response.data,
		requirements
	});
}) satisfies RequestHandler;
