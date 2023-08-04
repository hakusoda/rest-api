import { z } from 'zod';

import handler from '../../../lib/handler';
import { supabase } from '../../../lib/supabase';
import { getRequestingUser } from '../../../lib/database';
import { json, error, status } from '../../../lib/response';

export const runtime = 'edge';
export const POST = handler(async ({ body, headers }) => {
	const user = await getRequestingUser(headers);
	if (!user)
		return error(401, 'unauthorised');

	const response = await supabase.from('teams').insert({
		name: body.display_name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]/g, ''),
		creator_id: user.id,
		display_name: body.display_name
	}).select('id, name').limit(1).single();
	if (response.error) {
		console.error(response.error);
		return error(500, 'database_error');
	}

	const response2 = await supabase.from('team_members').insert({
		role: 255,
		user_id: user.id,
		team_id: response.data.id
	});
	if (response2.error) {
		console.error(response2.error);
		return error(500, 'database_error');
	}
	
	return json(response.data);
}, z.object({
	display_name: z.string().min(3).max(20)
}));

export const OPTIONS = () => status(200);