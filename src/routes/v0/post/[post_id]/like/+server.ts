import { ApiFeatureFlag } from '$lib/enums';
import { throwIfFeatureNotEnabled } from '$lib/util';
import supabase, { handleResponse } from '$lib/supabase';
export async function POST({ locals: { getSession }, params: { post_id } }) {
	await throwIfFeatureNotEnabled(ApiFeatureFlag.ProfilePostLikes);

	const session = await getSession();
	const response = await supabase.from('profile_post_likes')
		.upsert({
			post_id,
			user_id: session.sub
		});
	handleResponse(response);

	return new Response();
}

export async function DELETE({ locals: { getSession }, params: { post_id } }) {
	await throwIfFeatureNotEnabled(ApiFeatureFlag.ProfilePostLikes);

	const session = await getSession();
	const response = await supabase.from('profile_post_likes')
		.delete()
		.eq('post_id', post_id)
		.eq('user_id', session.sub);
	handleResponse(response);

	return new Response();
}