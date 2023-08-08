import handler from '../../../../../../lib/handler';
import { supabase } from '../../../../../../lib/supabase';
import { error, status } from '../../../../../../lib/response';
import { getRequestingUser } from '../../../../../../lib/database';

export const runtime = 'edge';
export const PATCH = handler(async ({ query, headers }) => {
	const user = await getRequestingUser(headers);
	if (!user)
		return error(401, 'unauthorised');

	const response = await supabase.from('team_invites').delete().eq('id', query.invite_id).eq('team_id', query.id).eq('user_id', user.id).select('author_id');
	if (response.error) {
		console.error(response.error);
		return error(500, 'database_error');
	}

	if (!response.data.length)
		return error(400, 'invalid_invite');

	const response2 = await supabase.from('team_roles').select('id, position').eq('team_id', query.id);
	if (response2.error) {
		console.error(response2.error);
		return error(500, 'database_error');
	}

	const response3 = await supabase.from('team_members').insert({
		user_id: user.id,
		team_id: query.id,
		role_id: response2.data.find(role => role.position === 0)?.id,
		inviter_id: response.data[0].author_id
	});
	if (response3.error) {
		console.error(response3.error);
		return error(500, 'database_error');
	}
	
	return status(200);
});

export const DELETE = handler(async ({ query, headers }) => {
	const user = await getRequestingUser(headers);
	if (!user)
		return error(401, 'unauthorised');

	const response = await supabase.from('team_invites').delete().eq('id', query.invite_id).eq('team_id', query.id).eq('user_id', user.id).select('author_id');
	if (response.error) {
		console.error(response.error);
		return error(500, 'database_error');
	}
	
	return status(200);
});

export const OPTIONS = () => status(200);