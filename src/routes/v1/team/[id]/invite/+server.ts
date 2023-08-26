import { z } from 'zod';

import { error } from '$lib/response';
import type { RequestHandler } from './$types';
import supabase, { handleResponse } from '$lib/supabase';
import { TeamAuditLogType, TeamRolePermission } from '$lib/enums';
import { parseBody, createTeamAuditLog, hasTeamPermissions } from '$lib/util';

const POST_PAYLOAD = z.object({
	user_id: z.string().uuid()
});
export const POST = (async ({ locals: { getUser }, params: { id }, request }) => {
	const user = await getUser();
	if (!await hasTeamPermissions(id, user.id, [TeamRolePermission.InviteUsers]))
		throw error(403, 'no_permission');

	const body = await parseBody(request, POST_PAYLOAD);
	const response = await supabase.from('team_invites').upsert({
		team_id: id,
		user_id: user.id,
		author_id: user.id
	});
	handleResponse(response);

	await createTeamAuditLog(TeamAuditLogType.InviteUser, user.id, id, undefined, undefined, body.user_id);

	return new Response();
}) satisfies RequestHandler;
export const OPTIONS = () => new Response();