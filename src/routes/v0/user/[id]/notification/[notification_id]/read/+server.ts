import { error } from '$lib/response';
import { UserNotificationState } from '$lib/enums';
import supabase, { handleResponse } from '$lib/supabase';
export async function POST({ locals: { getSession }, params: { id, notification_id } }) {
	const session = await getSession();
	if (session.sub !== id)
		throw error(403, 'forbidden');

	const response = await supabase.from('user_notifications')
		.update({ state: UserNotificationState.Read })
		.eq('id', notification_id)
		.eq('user_id', id);
	handleResponse(response);

	return new Response();
}