import { error } from '$lib/response';
import { processAvatarImage } from '$lib/image';
import type { RequestHandler } from './$types';
import supabase, { handleResponse } from '$lib/supabase';
export const config = { runtime: 'nodejs20.x' };
export const PATCH = (async ({ locals: { getSession }, params: { id }, request }) => {
	const session = await getSession();
	if (session.sub !== id)
		throw error(403, 'forbidden');

	const image = await processAvatarImage(await request.arrayBuffer());
	const response = await supabase.storage.from('avatars').upload(`/user/${id}.webp`, image, {
		upsert: true,
		contentType: 'image/webp'
	});
	if (response.error) {
		console.error(response.error);
		throw error(500, 'database_error');
	}

	const response2 = await supabase.from('users')
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

	const response3 = await supabase.from('users')
		.update({ avatar_url })
		.eq('id', id)
	handleResponse(response3);

	return new Response();
}) satisfies RequestHandler;
