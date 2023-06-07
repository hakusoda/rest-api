import type { Buffer } from 'node:buffer';

import { error } from './helpers/response';
import { supabase } from './supabase';
import type { ApiRequest } from './helpers';
import type { ApiUser, ApiTeam, RobloxLink, RobloxLinkType } from './types';

const uuidPattern = /\w{8}-\w{4}-\w{4}-\w{4}-\w{12}/;
export async function getUser(userId: string) {
	const { data, error } = await supabase.from('users').select<string, ApiUser>('id, bio, name, flags, username, created_at').eq(uuidPattern.test(userId) ? 'id' : 'username', userId).limit(1).maybeSingle();
	if (error) {
		console.error(error);
		return null;
	}

	if (!data)
		return null;

	return {
		...data,
		avatar_url: getUserAvatar(data.id)
	};
}

export async function getUserId(userId: string): Promise<string | null> {
	if (uuidPattern.test(userId))
		return userId;

	const { data, error } = await supabase.from('users').select('id').eq('username', userId);
	if (error) {
		console.error(error);
		return null;
	}

	const user = data?.[0] as any;
	if (!user)
		return null;

	return user.id;
}

export function getUserAvatar(userId: string) {
	return supabase.storage.from('avatars').getPublicUrl(`user/${userId}.png`).data.publicUrl;
}

export async function getUserRobloxLinks(userId: string, type?: RobloxLinkType): Promise<RobloxLink[]> {
	let filter = supabase.from('roblox_links').select('id, type, flags, owner, public, target_id, created_at').eq('owner', userId);
	if (typeof type !== 'number' || !Number.isNaN(type))
		filter = filter.eq('type', type);

	const { data, error } = await filter;
	if (error)
		return [];
	return data as any ?? [];
}

export async function getTeam(teamId: string) {
	const { data, error } = await supabase.from('teams').select<string, ApiTeam>('id, bio, name, flags, members:team_members ( role, user:users ( id, bio, name, flags, username, created_at ), joined_at ), created_at, display_name').eq(uuidPattern.test(teamId) ? 'id' : 'name', teamId).limit(1).maybeSingle();
	if (error) {
		console.error(error);
		return null;
	}

	if (!data)
		return null;

	return {
		...data,
		members: data.members.map(member => ({
			...member.user,
			avatar_url: getUserAvatar(member.user.id),
			role: member.role,
			joined_at: member.joined_at
		})),
		avatar_url: getTeamAvatar(data.id)
	};
}

export function getTeamAvatar(teamId: string) {
	return supabase.storage.from('avatars').getPublicUrl(`team/${teamId}.png`).data.publicUrl;
}

export async function uploadAvatar(userId: string, buffer: Buffer) {
	// TODO: somehow implement image resizing,
	// there doesn't appear to be any libraries that work with the edge runtime...
	return supabase.storage.from('avatars').upload(`user/${userId}.png`, buffer.buffer, {
		contentType: 'image/png'
	});
}

export async function getRequestingUser(request: ApiRequest) {
	const token = request.headers.get('authorization')?.slice(7);
	if (!token)
		return error(401, 'INVALID_AUTH');

	const { data: { user }, error: userError } = await supabase.auth.getUser(token);
	if (userError)
		return error(500, 'AUTH_ERROR');
	if (!user)
		return error(401, 'INVALID_AUTH');
	return user;
}