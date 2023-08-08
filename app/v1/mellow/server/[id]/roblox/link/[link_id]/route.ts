import handler from '../../../../../../../../lib/handler';
import { isUUID } from '../../../../../../../../lib/util';
import { supabase } from '../../../../../../../../lib/supabase';
import { error, status } from '../../../../../../../../lib/response';
import { MellowServerAuditLogType } from '../../../../../../../../lib/enums';
import { getRequestingUser, isUserMemberOfMellowServer, createMellowServerAuditLog } from '../../../../../../../../lib/database';

export const runtime = 'edge';
export const DELETE = handler(async ({ query, headers }) => {
	const user = await getRequestingUser(headers);
	if (!user)
		return error(401, 'unauthorised');

	if (isNaN(query.id as any) || !isUUID(query.link_id))
		return error(400, 'invalid_id');

	if (!await isUserMemberOfMellowServer(user.id, query.id))
		return error(403, 'no_permission');

	const response = await supabase.from('mellow_binds').delete().eq('id', query.link_id).eq('server_id', query.id).select('name');
	if (response.error) {
		console.error(response.error);
		return error(500, 'database_error');
	}

	await createMellowServerAuditLog(MellowServerAuditLogType.DeleteRobloxLink, user.id, query.id, {
		name: response.data[0].name
	});
	
	return status(200);
});

export const OPTIONS = () => status(200);