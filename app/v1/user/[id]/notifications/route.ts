import { supabase } from '../../../../../lib/supabase';
import { getRequestingUser } from '../../../../../lib/database';
import { json, error, status } from '../../../../../lib/response';

export const runtime = 'edge';
export async function GET(request: Request) {
	const user = await getRequestingUser(request.headers);
	if (!user)
		return error(401, 'unauthorised');

	const response = await supabase.from('user_notifications').select<string, {
		id: string
		data: any
		type: number
		state: number
		created_at: string
		target_user: {} | null
		target_team: {
			members: {
				user: {}
			}[]
		} | null
	}>('id, type, data, state, created_at, target_user:users!user_notifications_target_user_id_fkey\ ( id, bio, name, flags, username, avatar_url, created_at ), target_team:teams ( id, bio, name, members:team_members ( user:users ( id, bio, name, flags, username, avatar_url, created_at ) ), avatar_url, created_at, display_name )').eq('user_id', user.id).order('created_at', { ascending: false });
	if (response.error) {
		console.error(response.error);
		return error(500, 'database_error');
	}

	for (const { target_team } of response.data)
		if (target_team)
			(target_team.members as any) = target_team.members.map(member => member.user);
	return json(response.data, 200, 300);
}
export const OPTIONS = () => status(200);
export async function DELETE(request: Request) {
	const user = await getRequestingUser(request.headers);
	if (!user)
		return error(401, 'unauthorised');

	const response = await supabase.from('user_notifications').delete().eq('user_id', user.id);
	if (response.error) {
		console.error(response.error);
		return error(500, 'database_error');
	}

	return status(200);
}