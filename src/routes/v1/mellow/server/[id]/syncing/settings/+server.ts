import { z } from 'zod';

import { error } from '$lib/response';
import type { RequestHandler } from './$types';
import supabase, { handleResponse } from '$lib/supabase';
import { UserConnectionType, MellowServerAuditLogType } from '$lib/enums';
import { parseBody, createMellowServerAuditLog, isUserMemberOfMellowServer } from '$lib/util';

const PATCH_PAYLOAD = z.object({
	default_nickname: z.string().max(32).optional(),
	skip_onboarding_to: z.nativeEnum(UserConnectionType).nullable().optional(),
	allow_forced_syncing: z.boolean().optional()
});
export const PATCH = (async ({ locals: { getSession }, params: { id }, request }) => {
	const session = await getSession();
	if (!await isUserMemberOfMellowServer(session.sub, id))
		throw error(403, 'no_permission');

	const body = await parseBody(request, PATCH_PAYLOAD);
	const response = await supabase.from('mellow_servers')
		.select('default_nickname, skip_onboarding_to, allow_forced_syncing')
		.eq('id', id)
		.limit(1)
		.single();
	handleResponse(response);

	const response2 = await supabase.from('mellow_servers')
		.update(body)
		.eq('id', id);
	handleResponse(response2);

	await createMellowServerAuditLog(MellowServerAuditLogType.UpdateProfileSyncingSettings, session.sub, id, {
		default_nickname: [response.data!.default_nickname, body.default_nickname],
		skip_onboarding_to: [response.data!.skip_onboarding_to, body.skip_onboarding_to],
		allow_forced_syncing: [response.data!.allow_forced_syncing, body.allow_forced_syncing]
	});

	return new Response();
}) satisfies RequestHandler;