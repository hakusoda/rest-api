import { z } from 'zod';
import { json } from '@sveltejs/kit';

import { error } from '$lib/response';
import { TeamRolePermission } from '$lib/enums';
import type { RequestHandler } from './$types';
import supabase, { handleResponse } from '$lib/supabase';
import { isUUID, parseBody, hasTeamPermissions } from '$lib/util';
export const GET = (async ({ params: { id } }) => {
	const response = await supabase.from('teams')
		.select<string, {
			id: string
			bio: string
			name: string
			flags: number
			members: {
				role: number
				user: {
					id: string
					bio: string | null
					name: string | null
					flags: number
					username: string
					avatar_url: string
					created_at: string
				}
				joined_at: number
			}[]
			avatar_url: string
			created_at: string
			display_name: string
		}>('id, bio, name, flags, members:team_members ( role:team_roles ( id, name, position, permissions ), user:users!team_members_user_id_fkey\ ( id, bio, name, flags, username, avatar_url, created_at ), joined_at ), avatar_url, created_at, website_url, display_name')
		.eq(isUUID(id) ? 'id' : 'name', id)
		.limit(1)
		.maybeSingle();
	handleResponse(response);

	if (!response.data)
		throw error(404, 'not_found');

	return json({
		...response.data,
		members: response.data.members.map(member => ({
			...member.user,
			role: member.role,
			joined_at: member.joined_at
		}))
	});
}) satisfies RequestHandler;

const PATCH_BODY = z.object({
	bio: z.string().max(200).nullable().optional(),
	name: z.string().min(3).max(20).regex(/^\w+$/).optional(),
	website_url: z.string().url().max(50).nullable().optional(),
	display_name: z.string().min(3).max(20).optional()
});
export const PATCH = (async ({ locals: { getUser }, params: { id }, request }) => {
	const user = await getUser();
	if (!await hasTeamPermissions(id, user.id, [TeamRolePermission.ManageTeam]))
		throw error(403, 'no_permission');

	const body = await parseBody(request, PATCH_BODY);
	if (body.bio === undefined && !body.name && body.website_url === undefined && !body.display_name)
		throw error(400, 'invalid_body');

	const response = await supabase.from('teams')
		.update(body)
		.eq(isUUID(id) ? 'id' : 'name', id);
	handleResponse(response);

	if (!response.data)
		throw error(404, 'not_found');

	return new Response();
}) satisfies RequestHandler;
export const OPTIONS = () => new Response();