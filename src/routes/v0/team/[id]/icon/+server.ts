import { error } from '$lib/response';
import { hasTeamPermissions } from '$lib/util';
import { TeamRolePermission } from '$lib/enums';
import { process_avatar_image } from '$lib/image';
import supabase, { handleResponse } from '$lib/supabase';
export const config = { runtime: 'nodejs20.x' };
export async function PATCH({ locals: { getSession }, params: { id }, request }) {
	const session = await getSession();
	if (!await hasTeamPermissions(id, session.sub, [TeamRolePermission.ManageTeam]))
		throw error(403, 'no_permission');

	const image = await process_avatar_image(await request.arrayBuffer());
	const response = await supabase.storage.from('avatars').upload(`/team/${id}.${image.format}`, image.data, {
		upsert: true,
		contentType: `image/${image.format}`
	});
	if (response.error) {
		console.error(response.error);
		throw error(500, 'database_error');
	}

	const response2 = await supabase.from('teams')
		.select('avatar_url')
		.eq('id', id)
		.limit(1)
		.single();
	handleResponse(response2);

	let { avatar_url } = response2.data!;
	
	const target = supabase.storage.from('avatars').getPublicUrl(response.data.path).data.publicUrl;
	if (!avatar_url || !avatar_url.startsWith(target))
		avatar_url = target;
	else
		avatar_url = `${target}?v=${Number(new URL(avatar_url).searchParams.get('v')) + 1}`;

	const response3 = await supabase.from('teams')
		.update({ avatar_url })
		.eq('id', id)
	handleResponse(response3);

	return new Response();
}