
import handler from '../../../../../../../lib/handler';
import { supabase } from '../../../../../../../lib/supabase';
import { error, status } from '../../../../../../../lib/response';
import { getRequestingUser } from '../../../../../../../lib/database';

export const runtime = 'edge';
export const POST = handler(async request => {
	const user = await getRequestingUser(request.headers);
	if (!user)
		return error(401, 'unauthorised');

	const response = await supabase.from('user_notifications').update({
		state: 1
	}).eq('id', request.query.notification_id).eq('user_id', user.id);
	if (response.error) {
		console.error(response.error);
		return error(500, 'database_error');
	}

	return status(200);
});
export const OPTIONS = () => status(200);