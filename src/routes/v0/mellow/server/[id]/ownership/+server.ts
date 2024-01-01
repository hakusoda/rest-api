import { z } from 'zod';

import { error } from '$lib/response';
import supabase, { handleResponse } from '$lib/supabase';
import { parseBody, createTeamAuditLog, throwIfUserNotInSudo, createMellowServerAuditLog } from '$lib/util';

const PATCH_PAYLOAD = z.object({
	team_id: z.string().uuid().optional(),
	user_id: z.string().uuid().optional()
});
export async function PATCH({ locals: { getSession }, params: { id }, request }) {
	const session = await getSession();
	await throwIfUserNotInSudo(session.sub);

	if (isNaN(parseInt(id)))
		throw error(400, 'invalid_id');

	const response = await supabase.from('mellow_servers')
		.select<string, {
			owner_team: {
				id: string
				owner_id: string | null
			} | null
			owner_user_id: string
		}>('owner_user_id, owner_team:teams ( id, owner_id )')
		.eq('id', id)
		.limit(1)
		.single();
	handleResponse(response);

	if (response.data!.owner_user_id !== session.sub && response.data!.owner_team?.owner_id !== session.sub)
		throw error(403, 'no_permission');

	const { team_id, user_id } = await parseBody(request, PATCH_PAYLOAD);
	if (typeof team_id === typeof user_id)
		throw error(400, 'invalid_body');

	if (team_id) {
		const response = await supabase.from('teams')
			.select('*', { head: true, count: 'exact' })
			.eq('id', team_id)
			.eq('owner_id', session.sub);
		handleResponse(response);

		if (!response.count)
			throw error(403, 'no_team_permission');
	}

	handleResponse(
		await supabase.from('mellow_servers')
			.update({
				owner_team_id: team_id ?? null,
				owner_user_id: user_id ?? null
			})
			.eq('id', id)
	);
	
	await createMellowServerAuditLog('mellow.server.ownership.changed', session.sub, id, {
		team_id: [response.data!.owner_team?.id, team_id],
		user_id: [response.data!.owner_user_id, user_id]
	});

	if (team_id)
		await createTeamAuditLog('team.mellow_server.transferred.to_here', session.sub, team_id, {
			previous_user_id: response.data!.owner_user_id,
			previous_team_id: response.data!.owner_team?.id
		}, undefined, undefined, id);

	return new Response();
}