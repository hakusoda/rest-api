import { z } from 'zod';

import handler from '../../../../../lib/handler';
import { supabase } from '../../../../../lib/supabase';
import { error, status } from '../../../../../lib/response';
import { getRequestingUser } from '../../../../../lib/database';

export const runtime = 'edge';
export const POST = handler(async ({ body, query, headers }) => {
	const user = await getRequestingUser(headers);
	if (!user)
		return error(401, 'unauthorised');

	const response = await supabase.from('team_members').select('id', { head: true, count: 'exact' }).eq('user_id', user.id).eq('team_id', query.id).gte('role', 200).limit(1);
	if (response.error) {
		console.error(response.error);
		return error(500, 'database_error');
	}

	if (!response.count)
		return error(403, 'no_permission');

	const response2 = await supabase.from('team_invites').insert({
		user_id: body.user_id,
		team_id: query.id,
		author_id: user.id
	});
	if (response2.error) {
		console.error(response2.error);
		return error(500, 'database_error');
	}
	
	return status(200);
}, z.object({
	user_id: z.string().uuid()
}));

export const OPTIONS = () => status(200);