import { z } from 'zod';

import { error } from '$lib/response';
import type { RequestHandler } from './$types';
import supabase, { handleResponse } from '$lib/supabase';
import { TeamAuditLogType, TeamRolePermission } from '$lib/enums';
import { parseBody, createTeamAuditLog, hasTeamPermissions } from '$lib/util';

const POST_PAYLOAD = z.object({
	user_id: z.string().uuid()
});
export const POST = (async ({ locals: { getSession }, params: { id }, request }) => {
	const session = await getSession();
	if (!await hasTeamPermissions(id, session.sub, [TeamRolePermission.InviteUsers]))
		throw error(403, 'no_permission');

	const body = await parseBody(request, POST_PAYLOAD);
	const response = await supabase.from('team_invites').upsert({
		team_id: id,
		user_id: session.sub,
		author_id: session.sub
	});
	handleResponse(response);

	await createTeamAuditLog(TeamAuditLogType.InviteUser, session.sub, id, undefined, undefined, body.user_id);

	return new Response();
}) satisfies RequestHandler;