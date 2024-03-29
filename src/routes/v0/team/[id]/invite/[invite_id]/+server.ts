import { error } from '$lib/response';
import supabase, { handleResponse } from '$lib/supabase';
export async function PATCH({ locals: { getSession }, params: { id, invite_id } }) {
	const session = await getSession();
	const response = await supabase.from('team_invites')
		.delete()
		.eq('id', invite_id)
		.eq('team_id', id)
		.eq('user_id', session.sub)
		.select('author_id');
	handleResponse(response);

	if (!response.data!.length)
		throw error(400, 'invalid_invite');

	const response2 = await supabase.from('team_roles').select('id, position').eq('team_id', id);
	handleResponse(response2);

	const response3 = await supabase.from('team_members').insert({
		team_id: id,
		user_id: session.sub,
		role_id: response2.data!.find(role => role.position === 0)?.id,
		inviter_id: response.data![0].author_id
	});
	handleResponse(response3);

	return new Response();
}

export async function DELETE({ locals: { getSession }, params: { id, invite_id } }) {
	const session = await getSession();
	const response = await supabase.from('team_invites')
		.delete()
		.eq('id', invite_id)
		.eq('team_id', id)
		.eq('user_id', session.sub);
	handleResponse(response);

	return new Response();
}