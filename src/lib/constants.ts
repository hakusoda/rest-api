import { z } from 'zod';
import { OpenCloudClient, exchangeOAuthCodeForMethod } from '@voxelified/roblox-open-cloud';

import { error } from './response';
import { fetchJson } from './util';
import { UserConnectionType } from '$lib/enums';
import type { UserConnectionCallbackResponse } from './types';
import { JWT_SECRET as _JWT_SECRET, GITHUB_ID, ROBLOX_ID, DISCORD_ID, GITHUB_SECRET, ROBLOX_SECRET, DISCORD_SECRET } from '$env/static/private';
import { MellowProfileSyncActionType, MellowProfileSyncActionRequirementType, MellowProfileSyncActionRequirementsType } from '$lib/enums';
export const UUID_REGEX = /^\w{8}-\w{4}-\w{4}-\w{4}-\w{12}$/;
export const USERNAME_REGEX = /^[\w-]+$/;
export const DISPLAY_NAME_REGEX = /^[\w !@#$%^&*()-:;"'{}[\]?\\|~`<>]+$/;

const mellowRemoveMemberMetadata = z.object({
	audit_log_reason: z.string().max(512).nullable(),
	user_facing_reason: z.string().max(512).nullable()
});

export const MELLOW_SERVER_PROFILE_SYNC_ACTION_METADATA: Record<MellowProfileSyncActionType, z.ZodType> = {
	[MellowProfileSyncActionType.GiveRoles]: z.object({
		items: z.array(z.string().max(64)).max(50).default([]),
		can_remove: z.boolean().default(true)
	}),
	[MellowProfileSyncActionType.BanFromServer]: mellowRemoveMemberMetadata.extend({
		delete_messages_seconds: z.number().int().min(0).max(604800).default(0)
	}),
	[MellowProfileSyncActionType.KickFromServer]: mellowRemoveMemberMetadata,
	[MellowProfileSyncActionType.CancelSync]: z.object({
		user_facing_reason: z.string().max(512).nullable()
	})
};

export const MELLOW_SERVER_PROFILE_SYNC_ACTION_PAYLOAD_UNTRANSFORMED = z.object({
	name: z.string().max(50),
	type: z.nativeEnum(MellowProfileSyncActionType),
	metadata: z.object({}).passthrough(),
	requirements: z.array(z.object({
		data: z.array(z.string().max(100).or(z.number().int().finite()).transform(value => value.toString())).max(5),
		type: z.nativeEnum(MellowProfileSyncActionRequirementType)
	})).max(25),
	requirements_type: z.nativeEnum(MellowProfileSyncActionRequirementsType)
});

export const MELLOW_SERVER_PROFILE_SYNC_ACTION_PAYLOAD_TRANSFORMER = ((value, ctx) => {
	if (!value.metadata)
		return value;
	
	const result = MELLOW_SERVER_PROFILE_SYNC_ACTION_METADATA[value.type].safeParse(value.metadata);
	if (result.success)
		return { ...value, metadata: result.data };

	for (const issue of result.error.issues)
		ctx.addIssue({ ...issue, path: issue.path ? ['metadata', ...issue.path] : issue.path });
	return z.NEVER;
}) satisfies (arg: z.infer<typeof MELLOW_SERVER_PROFILE_SYNC_ACTION_PAYLOAD_UNTRANSFORMED>, ctx: z.RefinementCtx) => z.infer<typeof MELLOW_SERVER_PROFILE_SYNC_ACTION_PAYLOAD_UNTRANSFORMED>;

export const MELLOW_SERVER_PROFILE_SYNC_ACTION_PAYLOAD = MELLOW_SERVER_PROFILE_SYNC_ACTION_PAYLOAD_UNTRANSFORMED.transform((value, ctx) => {
	const result = MELLOW_SERVER_PROFILE_SYNC_ACTION_METADATA[value.type].safeParse(value.metadata);
	if (result.success)
		return { ...value, metadata: result.data };

	for (const issue of result.error.issues)
		ctx.addIssue(issue);
	return z.NEVER;
});

export const USER_CONNECTION_CALLBACKS: Record<UserConnectionType, (url: URL) => Promise<UserConnectionCallbackResponse>> = {
	[UserConnectionType.Discord]: async (url: URL) => {
		const code = url.searchParams.get('code');
		if (!code)
			throw error(400, 'invalid_query');

		const params = new URLSearchParams();
		params.set('code', code);
		params.set('client_id', DISCORD_ID);
		params.set('grant_type', 'authorization_code');
		params.set('redirect_uri', `https://${url.hostname}${url.pathname}`);
		params.set('client_secret', DISCORD_SECRET);

		const { token_type, access_token } = await fetchJson('https://discord.com/api/v10/oauth2/token', {
			body: params,
			method: 'POST', 
			headers: {
				'content-type': 'application/x-www-form-urlencoded'
			}
		});
		if (!access_token)
			throw error(500, 'unknown');

		const metadata = await fetchJson('https://discord.com/api/v10/users/@me', {
			headers: { authorization: `${token_type} ${access_token}` }
		});
		const { id, avatar, username, global_name } = metadata;
		if (!id)
			throw error(500, 'unknown');

		if (url.searchParams.get('state') === 'roblox')
			url.searchParams.set('redirect_uri', `https://apis.roblox.com/oauth/v1/authorize?scope=openid+profile&client_id=3637948605801680640&redirect_uri=https%3A%2F%2Fapi.hakumi.cafe%2Fv1%2Fauth%2Fcallback%2F2&response_type=code`);

		return {
			sub: id,
			name: global_name || username,
			username,
			metadata,
			avatar_url: avatar ? `https://cdn.discordapp.com/avatars/${id}/${avatar}.${avatar.startsWith('a_') ? 'gif' : 'webp'}?size=256` : null
		};
	},
	[UserConnectionType.GitHub]: async (url: URL) => {
		const code = url.searchParams.get('code');
		if (!code)
			throw error(400, 'invalid_query');

		const params = new URLSearchParams({
			code,
			client_id: GITHUB_ID,
			client_secret: GITHUB_SECRET
		});
		const { access_token } = await fetchJson('https://github.com/login/oauth/access_token', {
			body: params,
			method: 'POST',
			headers: { accept: 'application/json', 'content-type': 'application/x-www-form-urlencoded;charset=UTF-8' }
		});
		const metadata = await fetchJson('https://api.github.com/user', {
			headers: {
				accept: 'application/json',
				authorization: `Bearer ${access_token}`
			}
		});
		const { id, name, login, avatar_url } = metadata;
		if (!id)
			throw error(500, 'unknown');

		return {
			sub: id,
			name,
			metadata,
			username: login,
			avatar_url
		};
	},
	[UserConnectionType.Roblox]: async (url: URL) => {
		const code = url.searchParams.get('code');
		if (!code)
			throw error(400, 'invalid_query');

		const auth = await exchangeOAuthCodeForMethod(ROBLOX_ID as any, ROBLOX_SECRET as any, code)
			.catch(() => {
				throw error(500, 'external_request_error');
			});

		const metadata = await new OpenCloudClient(auth).users.get()!;
		const { sub, name, profile, picture, preferred_username } = metadata;
		
		// we revoke the authorisation immediately after using it, as we are unable to publish the OAuth 2.0 Application, and we don't wish to hit the 100 user limit. although we don't know if this actually works.
		// plus, we don't actually need it after this.
		await fetch('https://apis.roblox.com/oauth/v1/token/revoke', {
			body: new URLSearchParams({
				token: auth.data.refresh_token,
				client_id: ROBLOX_ID,
				client_secret: ROBLOX_SECRET
			}),
			method: 'POST',
			headers: {
				'content-type': 'application/x-www-form-urlencoded'
			}
		});

		return {
			sub,
			name,
			metadata,
			username: preferred_username!,
			avatar_url: picture,
			website_url: profile
		};
	}
};

export const RELYING_PARTY_ID = 'hakumi.cafe';

export const JWT_SECRET = new TextEncoder().encode(_JWT_SECRET);

export const API_URL = 'https://api.hakumi.cafe';
export const WEBSITE_URL = `https://${RELYING_PARTY_ID}`;

export const OAUTH_SCOPES = ['openid'] as const;
export const OAUTH_SCOPE_OPERATIONS = ['read'] as const;