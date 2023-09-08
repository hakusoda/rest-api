import { z } from 'zod';

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