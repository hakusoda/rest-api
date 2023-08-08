import { z } from 'zod';

import handler from '../../../lib/handler';
import { supabase } from '../../../lib/supabase';
import { json, error, status } from '../../../lib/response';
import { getUser, getRequestingUser } from '../../../lib/database';
import { USERNAME_REGEX, DISPLAY_NAME_REGEX } from '../../../lib/constants';

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

export const PATCH = handler(async ({ body, headers }) => {
	const user = await getRequestingUser(headers);
	if (!user)
		return status(404);

	if (body.bio === undefined && body.name === undefined && !body.username)
		return error(400, 'invalid_body');

	const response = await supabase.from('users').update(body).eq('id', user.id);
	if (response.error) {
		if (response.error.details.startsWith('Key (username)='))
			return error(400, 'username_taken');
		
		console.error(response.error);
		return error(500, 'database_error');
	}

	return status(200);
}, z.object({
	bio: z.string().max(200).nullable().optional(),
	name: z.string().min(3).max(20).regex(DISPLAY_NAME_REGEX).nullable().optional(),
	username: z.string().min(3).max(20).regex(USERNAME_REGEX).optional()
}));

export const OPTIONS = () => status(200);