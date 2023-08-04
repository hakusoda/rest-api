import { supabase } from '../../../../../lib/supabase';
import { error, status } from '../../../../../lib/response';
import { uploadTeamAvatar, getRequestingUser } from '../../../../../lib/database';

export const runtime = 'edge';
export async function PATCH(request: Request) {
	const user = await getRequestingUser(request.headers);
	if (!user)
		return error(401, 'unauthorised');

	const teamId = new URL(request.url).searchParams.get('id')!;
	const response = await supabase.from('team_members').select('role').eq('user_id', user.id).eq('team_id', teamId).limit(1).maybeSingle();
	if (response.error) {
		console.error(response.error);
		return error(500, 'database_error');
	}

	if (!response.data || response.data.role < 200)
		return error(403, 'no_permission');

	const response2 = await uploadTeamAvatar(teamId, await request.arrayBuffer());
	if (response2.error) {
		console.error(response2.error);
		return error(500, 'database_error');
	}

	return status(200);
}
export const OPTIONS = () => status(200);