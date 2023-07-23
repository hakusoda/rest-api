import { supabase } from '../../../../../../lib/supabase';
import { error, status } from '../../../../../../lib/response';
import { getRequestingUser } from '../../../../../../lib/database';
import { UserNotificationState } from '../../../../../../lib/enums';

export const runtime = 'edge';
export async function POST(request: Request) {
	const user = await getRequestingUser(request.headers);
	if (!user)
		return error(401, 'unauthorised');

	const response = await supabase.from('user_notifications').update({
		state: UserNotificationState.Read
	}).eq('user_id', user.id);
	if (response.error) {
		console.error(response.error);
		return error(500, 'database_error');
	}

	return status(200);
}
export const OPTIONS = () => status(200);