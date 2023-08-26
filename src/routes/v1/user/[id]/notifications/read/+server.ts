import { error } from '$lib/response';
import type { RequestHandler } from './$types';
import { UserNotificationState } from '$lib/enums';
import supabase, { handleResponse } from '$lib/supabase';
export const POST = (async ({ locals: { getUser }, params: { id } }) => {
	const user = await getUser();
	if (user.id !== id)
		throw error(403, 'forbidden');

	const response = await supabase.from('user_notifications')
		.update({ state: UserNotificationState.Read })
		.eq('user_id', id);
	handleResponse(response);

	return new Response();
}) satisfies RequestHandler;
export const OPTIONS = () => new Response();