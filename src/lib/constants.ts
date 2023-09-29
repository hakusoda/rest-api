import { z } from 'zod';

import { dev } from '$app/environment';
import { JWT_SECRET as _JWT_SECRET } from '$env/static/private';
import { MellowProfileSyncActionType, MellowProfileSyncActionRequirementType, MellowProfileSyncActionRequirementsType } from '$lib/enums';
export const UUID_REGEX = /^\w{8}-\w{4}-\w{4}-\w{4}-\w{12}$/;
export const USERNAME_REGEX = /^[\w-]+$/;
export const DISPLAY_NAME_REGEX = /^[\w !@#$%^&*()-:;"'{}[\]?\\|~`<>]+$/;

export const MELLOW_SERVER_PROFILE_SYNC_ACTION_PAYLOAD = z.object({
	name: z.string().max(50),
	type: z.nativeEnum(MellowProfileSyncActionType),
	data: z.array(z.string().max(100)).max(20),
	requirements: z.array(z.object({
		data: z.array(z.string().max(100)).max(5),
		type: z.nativeEnum(MellowProfileSyncActionRequirementType)
	})).max(25),
	requirements_type: z.nativeEnum(MellowProfileSyncActionRequirementsType)
});

export const RELYING_PARTY_ID = dev ? 'website-dev-tunnel.voxelified.com' : 'voxelified.com';

export const JWT_SECRET = new TextEncoder().encode(_JWT_SECRET);

export const API_URL = dev ? 'https://api-dev-tunnel.voxelified.com' : 'https://api.voxelified.com';
export const WEBSITE_URL = `https://${RELYING_PARTY_ID}`;

export const OAUTH_SCOPES = ['openid'] as const;
export const OAUTH_SCOPE_OPERATIONS = ['read'] as const;