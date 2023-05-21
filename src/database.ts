import type { Buffer } from 'node:buffer';

import { error } from './helpers/response';
import { supabase } from './supabase';
import type { User } from './types';
import type { ApiRequest } from './helpers';

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

export function getUserAvatar(userId: string) {
	return supabase.storage.from('avatars').getPublicUrl(`user/${userId}.png`).data.publicUrl;
}

function check(buffer: Buffer, headers: number[]) {
	for (const [index, header] of headers.entries())
		if (header !== buffer[index])
			return false;
	return true;
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