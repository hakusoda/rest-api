import { error } from '$lib/response';
import type { RequestHandler } from './$types';
import { MellowServerAuditLogType } from '$lib/enums';
import supabase, { handleResponse } from '$lib/supabase';
import { createMellowServerAuditLog, isUserMemberOfMellowServer } from '$lib/util';
export const DELETE = (async ({ locals: { getUser }, params: { id, link_id } }) => {
	const user = await getUser();
	if (!await isUserMemberOfMellowServer(user.id, id))
		throw error(403, 'no_permission');

	const response = await supabase.from('mellow_binds')
		.delete()
		.eq('id', link_id)
		.eq('server_id', id)
		.select('name');
	handleResponse(response);

	await createMellowServerAuditLog(MellowServerAuditLogType.DeleteRobloxLink, user.id, id, {
		name: response.data![0].name
	});

	return new Response();
}) satisfies RequestHandler;
export const OPTIONS = () => new Response();