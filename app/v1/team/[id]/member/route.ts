import handler from '../../../../../lib/handler';
import { isUUID } from '../../../../../lib/util';
import { supabase } from '../../../../../lib/supabase';
import { error, status } from '../../../../../lib/response';
import { getRequestingUser } from '../../../../../lib/database';

export const runtime = 'edge';
export const DELETE = handler(async ({ query, headers }) => {
	const user = await getRequestingUser(headers);
	if (!user)
		return error(401, 'unauthorised');

	const response = await supabase.from('teams').select('id, owner_id').eq(isUUID(query.id) ? 'id' : 'name', query.id).limit(1).maybeSingle();
	if (response.error) {
		console.error(response.error);
		return error(500, 'database_error');
	}

	if (!response.data)
		return error(404, 'team_not_found');

	if (response.data.owner_id === user.id)
		return error(400, 'cannot_leave_team');

	const response2 = await supabase.from('team_members').delete().eq('user_id', user.id).eq('team_id', response.data.id);
	if (response2.error) {
		console.error(response2.error);
		return error(500, 'database_error');
	}

	return status(200);
});
export const OPTIONS = () => status(200);