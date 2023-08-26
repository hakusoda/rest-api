import { json } from '@sveltejs/kit';

import { error } from '$lib/response';
import type { RequestHandler } from './$types';
import supabase, { handleResponse } from '$lib/supabase';
export const GET = (async ({ locals: { getUser }, params: { id } }) => {
	const user = await getUser();
	if (user.id !== id)
		throw error(403, 'forbidden');

	const response = await supabase.from('user_notifications').select<string, {
		id: string
		data: any
		type: number
		state: number
		created_at: string
		target_user: {} | null
		target_team: {
			member_count: [{ count: number }]
		} | null
	}>('id, type, data, state, created_at, target_user:users!user_notifications_target_user_id_fkey\ ( id, bio, name, flags, username, avatar_url, created_at ), target_team:teams ( id, bio, name, member_count:team_members ( count ), avatar_url, created_at, display_name )')
		.eq('user_id', id)
		.order('created_at', { ascending: false });
	handleResponse(response);

	for (const { target_team } of response.data!)
		if (target_team)
			(target_team.member_count as any) = target_team.member_count[0].count;

	return json(response.data!);
}) satisfies RequestHandler;
