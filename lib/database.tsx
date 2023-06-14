import { ImageResponse } from 'next/server';

import { supabase } from './supabase';
import type { ApiUser, ApiTeam, RobloxLink, RobloxLinkType } from './types';

const uuidPattern = /\w{8}-\w{4}-\w{4}-\w{4}-\w{12}/;
export async function getUser(userId: string) {
	const { data, error } = await supabase.from('users').select<string, ApiUser>('id, bio, name, flags, username, avatar_url, created_at').eq(uuidPattern.test(userId) ? 'id' : 'username', userId).limit(1).maybeSingle();
	if (error) {
		console.error(error);
		return null;
	}

	return data;
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
	const { data, error } = await supabase.from('teams').select<string, ApiTeam>('id, bio, name, flags, members:team_members ( role, user:users ( id, bio, name, flags, username, avatar_url, created_at ), joined_at ), avatar_url, created_at, display_name').eq(uuidPattern.test(teamId) ? 'id' : 'name', teamId).limit(1).maybeSingle();
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
			role: member.role,
			joined_at: member.joined_at
		}))
	};
}

export async function uploadAvatar(userId: string, buffer: ArrayBuffer) {
	const image = new ImageResponse(<img src={buffer as any} width="256" height="256"/>, {
		width: 256,
		height: 256
	}) as Response;

	const path = `user/${userId}.png`;
	return supabase.storage.from('avatars').upload(path, await image.arrayBuffer(), {
		upsert: true,
		contentType: 'image/png'
	}).then(async response => {
		if (!response.error) // is it actually required to await the transform builder?
			await supabase.from('users').select('avatar_url').eq('id', userId).limit(1).single().then(async response => {
				if (response.error)
					return console.error(response.error);
				let url = response.data.avatar_url;
				const target = supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl;
				if (!url || !url.startsWith(target))
					url = target;
				else
					url = `${target}?v=${Number(new URL(url).searchParams.get('v')) + 1}`;

				await supabase.from('users').update({ avatar_url: url }).eq('id', userId).then(response => {
					if (response.error)
						return console.error(response.error);
				});
			});
		return response;
	});
}

export async function getRequestingUser(headers: Headers) {
	const token = headers.get('authorization')?.slice(7);
	if (!token)
		return null;

	const { data: { user }, error: userError } = await supabase.auth.getUser(token);
	if (userError) {
		console.error(userError);
		return null;
	}
	
	return user;
}