import { ImageResponse } from 'next/server';

import { isUUID } from './util';
import { supabase } from './supabase';
import type { MellowServerAuditLogType } from './enums';
import type { ApiUser, ApiTeam, RobloxLink, RobloxLinkType } from './types';

export async function getUser(userId: string) {
	const { data, error } = await supabase.from('users').select<string, ApiUser>('id, bio, name, flags, username, avatar_url, created_at').eq(isUUID(userId) ? 'id' : 'username', userId).limit(1).maybeSingle();
	if (error) {
		console.error(error);
		return null;
	}

	return data;
}

export async function getUserId(userId: string): Promise<string | null> {
	if (isUUID(userId))
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
	const { data, error } = await supabase.from('teams').select<string, ApiTeam>('id, bio, name, flags, members:team_members ( role:team_roles ( id, name, position, permissions ), user:users!team_members_user_id_fkey\ ( id, bio, name, flags, username, avatar_url, created_at ), joined_at ), avatar_url, created_at, website_url, display_name').eq(isUUID(teamId) ? 'id' : 'name', teamId).limit(1).maybeSingle();
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
		if (!response.error)
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

export async function uploadTeamAvatar(teamId: string, buffer: ArrayBuffer) {
	const image = new ImageResponse(<img src={buffer as any} width="256" height="256"/>, {
		width: 256,
		height: 256
	}) as Response;

	const path = `team/${teamId}.png`;
	return supabase.storage.from('avatars').upload(path, await image.arrayBuffer(), {
		upsert: true,
		contentType: 'image/png'
	}).then(async response => {
		if (!response.error)
			await supabase.from('teams').select('avatar_url').eq('id', teamId).limit(1).single().then(async response => {
				if (response.error)
					return console.error(response.error);
				let url = response.data.avatar_url;
				const target = supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl;
				if (!url || !url.startsWith(target))
					url = target;
				else
					url = `${target}?v=${Number(new URL(url).searchParams.get('v')) + 1}`;

				await supabase.from('teams').update({ avatar_url: url }).eq('id', teamId).then(response => {
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

export async function isUserMemberOfMellowServer(userId: string, serverId: string) {
	const response = await supabase.from('mellow_server_members').select('*', { head: true, count: 'exact' }).eq('user_id', userId).eq('server_id', serverId).limit(1).maybeSingle();
	if (response.error) {
		console.error(response.error);
		return false;
	}

	if (!response.count)
		return false;
	return true;
}

export async function createMellowServerAuditLog(type: MellowServerAuditLogType, author_id: string, server_id: string, data?: any, target_link_id?: string) {
	const { error } = await supabase.from('mellow_server_audit_logs').insert({
		type,
		data,
		author_id,
		server_id,
		target_link_id
	});
	if (error)
		console.error(error);
}