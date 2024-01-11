import { z } from 'zod';
import { SignJWT } from 'jose';

import { error } from '$lib/response';
import { parseBody } from '$lib/util';
import { JWT_SECRET } from '$lib/constants';
import supabase, { handleResponse } from '$lib/supabase';

const POST_PAYLOAD = z.object({
	id: z.string(),
	device_public_key: z.string()
});
export async function POST({ cookies, request }) {
	const { id, device_public_key } = await parseBody(request, POST_PAYLOAD);
	const response = handleResponse(await supabase.from('user_recovery_links')
		.delete()
		.eq('id', id)
		.select('user_id')
	);
	if (!response.data?.[0])
		throw error(400, 'invalid_recovery_link');

	const token = await new SignJWT({ sub: response.data[0].user_id, device_public_key })
		.setProtectedHeader({ alg: 'HS256' })
		.setIssuedAt()
		.sign(JWT_SECRET);
	cookies.set('auth-token', token, { path: '/', domain: '.hakumi.cafe', expires: new Date(Date.now() + 31556926000), sameSite: 'none', httpOnly: false });

	return new Response();
}