import type { Buffer } from 'node:buffer';

import { error } from './helpers/response';
import { supabase } from './supabase';
import type { ApiRequest } from './helpers';
import type { User, RobloxLink, RobloxLinkType } from './types';

const uuidPattern = /\w{8}-\w{4}-\w{4}-\w{4}-\w{12}/;
export async function getUser(userId: string): Promise<User | null> {
	const { data, error } = await supabase.from('users').select('*').eq(uuidPattern.test(userId) ? 'id' : 'username', userId);
	if (error)
		return null;

	const user = data?.[0] as any;
	if (!user)
		return null;

	return {
		...user,
		avatar_url: getUserAvatar(user.id)
	};
}

export async function getUserId(userId: string): Promise<string | null> {
	const { data, error } = await supabase.from('users').select('id').eq(uuidPattern.test(userId) ? 'id' : 'username', userId);
	if (error)
		return null;

	const user = data?.[0] as any;
	if (!user)
		return null;

	return user.id;
}

export function getUserAvatar(userId: string) {
	return supabase.storage.from('avatars').getPublicUrl(`user/${userId}.png`).data.publicUrl;
}

export async function getUserRobloxLinks(userId: string, type?: RobloxLinkType): Promise<RobloxLink[]> {
	let filter = supabase.from('roblox_links').select('*').eq('owner', userId);
	if (typeof type !== 'number' || !Number.isNaN(type))
		filter = filter.eq('type', type);

	const { data, error } = await filter;
	if (error)
		return [];
	return data as any ?? [];
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