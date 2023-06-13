import { z } from 'zod';

import handler from '../../../lib/handler';
import { supabase } from '../../../lib/supabase';
import { json, error, status } from '../../../lib/response';
import { getUser, getRequestingUser } from '../../../lib/database';

export const runtime = 'edge';
export const POST = handler(async request => {
	const user = await getRequestingUser(request.headers);
	if (!user)
		return error(401, 'unauthorised');

	const profile = await getUser(user.id);
	if (profile)
		return error(400, 'profile_exists');

	const { username } = request.body;
	const { data, error: insertError } = await supabase.from('users').insert({
		id: user.id,
		username
	}).select();
	if (insertError || !data?.[0])
		return error(500, 'database_error');
	
	return json(data[0]);
}, z.object({
	username: z.string().regex(/^[\w-]+$/).min(3).max(20)
}));

export const OPTIONS = () => status(200);