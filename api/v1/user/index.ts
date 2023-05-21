import { z } from 'zod';
import { Buffer } from 'node:buffer';

import { POST } from '../../../src/helpers';
import { supabase } from '../../../src/supabase';
import { json, error } from '../../../src/helpers/response';
import { getUser, uploadAvatar, getRequestingUser } from '../../../src/database';

export const config = { runtime: 'edge', regions: ['iad1'] };
export default POST(async request => {
	const user = await getRequestingUser(request);
	if (user instanceof Response)	
		return user;

	const profile = await getUser(user.id);
	if (profile)
		return error(400, 'PROFILE_EXISTS');

	const { icon, username } = request.body;
	const { data, error: insertError } = await supabase.from('users').insert({
		id: user.id,
		username
	}).select();
	console.log(insertError);
	if (insertError || !data?.[0])
		return error(500, 'POSTGRES_ERROR');

	if (icon) {
		const response = await uploadAvatar(user.id, Buffer.from(icon));
		if (response instanceof Response)	
			return response;
		if (response.error)
			return error(500, 'UPLOAD_ERROR', response.error.message)
	}
	
	return json(data[0]);
}, z.object({
	icon: z.array(z.number()).optional(),
	username: z.string().regex(/^\w{3,20}$/)
}));