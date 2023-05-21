import { supabase } from './supabase';
import type { User } from './types';

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