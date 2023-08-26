import { json } from '@sveltejs/kit';

import type { RequestHandler } from './$types';
import type { UserRobloxLinkType } from '$lib/enums';
import supabase, { handleResponse } from '$lib/supabase';
export const GET = (async ({ url, locals: { getUser }, params: { id } }) => {
	const user = await getUser(false);
	const builder = supabase.from('roblox_links')
		.select<string, {
			id: string
			type: UserRobloxLinkType
			flags: number
			public: boolean
			target_id: string
			created_at: string
		}>('id, type, flags, public, target_id, created_at')
		.eq('owner_id', id);
	if (user?.id !== id)
		builder.eq('public', true);

	const type = parseInt(url.searchParams.get('type')!);
	if (!isNaN(type))
		builder.eq('type', type);
	
	const response = await builder;
	handleResponse(response);

	return json(response.data!);
}) satisfies RequestHandler;
export const OPTIONS = () => new Response();