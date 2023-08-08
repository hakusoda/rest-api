import { z, type ZodIssue } from 'zod';

import handler from '../../../../../../../lib/handler';
import { supabase } from '../../../../../../../lib/supabase';
import { json, error, status } from '../../../../../../../lib/response';
import { getRequestingUser, isUserMemberOfMellowServer, createMellowServerAuditLog } from '../../../../../../../lib/database';
import { MellowRobloxLinkType, MellowServerAuditLogType, MellowRobloxLinkRequirementType, MellowRobloxLinkRequirementsType } from '../../../../../../../lib/enums';

export const runtime = 'edge';
export const POST = handler(async ({ body, query, headers }) => {
	const user = await getRequestingUser(headers);
	if (!user)
		return error(401, 'unauthorised');

	if (isNaN(query.id as any))
		return error(400, 'invalid_id');

	if (!await isUserMemberOfMellowServer(user.id, query.id))
		return error(403, 'no_permission');

	const issues: ZodIssue[] = [];
	for (const [index, { type, data: rData }] of Object.entries(body.requirements)) {
		if (type === MellowRobloxLinkRequirementType.HasRobloxGroupRole || type === MellowRobloxLinkRequirementType.HasRobloxGroupRankInRange) {
			if (!isFinite(+rData[0]))
				issues.push({
					code: 'custom',
					path: ['requirements', index, 'data', 0],
					message: ''
				});
		}

		if (type === MellowRobloxLinkRequirementType.HasRobloxGroupRole) {
			if (!isFinite(+rData[1]))
				issues.push({
					code: 'custom',
					path: ['requirements', index, 'data', 1],
					message: ''
				});
		} else if (type === MellowRobloxLinkRequirementType.HasRobloxGroupRankInRange) {
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
		return error(400, 'invalid_body', { issues });

	const response = await supabase.from('mellow_binds').insert({
		name: body.name,
		type: body.type,
		server_id: query.id,
		creator_id: user.id,
		target_ids: body.target_ids,
		requirements_type: body.requirements_type
	}).select('id, name, type, creator:users ( name, username ), created_at, target_ids, requirements_type').limit(1).single();
	if (response.error) {
		console.error(response.error);
		return error(500, 'database_error');
	}

	let requirements: any[] = [];
	if (body.requirements.length) {
		const response3 = await supabase.from('mellow_bind_requirements').insert(body.requirements.map(item => ({
			type: item.type,
			data: item.data,
			bind_id: response.data.id
		}))).select('id, type, data');
		if (response3.error) {
			console.error(response3.error);
			return error(500, 'database_error');
		}

		requirements = response3.data;
	}
	
	await createMellowServerAuditLog(MellowServerAuditLogType.CreateRobloxLink, user.id, query.id, {
		name: body.name,
		type: body.type,
		targets: body.target_ids.length,
		requirements: body.requirements.length,
		requirements_type: body.requirements_type
	}, response.data.id);

	return json({
		...response.data,
		requirements
	});
}, z.object({
	name: z.string().max(50),
	type: z.nativeEnum(MellowRobloxLinkType),
	target_ids: z.array(z.string().max(100)).min(1).max(100),
	requirements: z.array(z.object({
		data: z.array(z.string().max(100)).max(5),
		type: z.nativeEnum(MellowRobloxLinkRequirementType)
	})),
	requirements_type: z.nativeEnum(MellowRobloxLinkRequirementsType)
}));

export const OPTIONS = () => status(200);