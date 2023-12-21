import { error } from '$lib/response';
import type { RequestHandler } from './$types';
import { UserNotificationState } from '$lib/enums';
import supabase, { handleResponse } from '$lib/supabase';
export const POST = (async ({ locals: { getSession }, params: { id } }) => {
	const session = await getSession();
	if (session.sub !== id)
		throw error(403, 'forbidden');

	const response = await supabase.from('user_notifications')
		.update({ state: UserNotificationState.Read })
		.eq('user_id', id);
	handleResponse(response);

	return new Response();
}) satisfies RequestHandler;
