import { z } from 'zod';

import { ROBLOX_ID } from '../roblox';
import { DISCORD_SNOWFLAKE } from '../discord';
import { UserConnectionType } from '$lib/enums';

export const QUANTIFIER = z.object({
	kind: z.enum(['all'])
}).or(z.object({
	kind: z.enum(['at_least']),
	value: z.number().int().min(1).max(32).default(1)
}));

export const CRITERIA_ITEM = z.discriminatedUnion('kind', [
	z.object({
		kind: z.literal('hakumi.user.connection'),
		connection_kind: z.nativeEnum(UserConnectionType)
	}),
	z.object({
		kind: z.literal('mellow.server.syncing.actions'),
		action_ids: z.array(z.string().uuid()).max(31),
		quantifier: QUANTIFIER
	}),
	z.object({
		kind: z.literal('roblox.group.membership'),
		group_id: ROBLOX_ID
	}),
	z.object({
		kind: z.literal('roblox.group.membership.role'),
		role_id: ROBLOX_ID,
		group_id: ROBLOX_ID
	}),
	z.object({
		kind: z.literal('roblox.group.membership.role.rank.in_range'),
		group_id: ROBLOX_ID,
		range_lower: z.number().int().min(0).max(255),
		range_upper: z.number().int().min(0).max(255)
	}),
	z.object({
		kind: z.literal('patreon.campaign.tier_subscription'),
		tier_id: z.string().max(16),
		campaign_id: z.string().max(16)
	})
]);

export const CRITERIA = z.object({
	items: z.array(CRITERIA_ITEM).max(32),
	quantifier: QUANTIFIER
});

export const SYNC_ACTION_DATA_SCHEMAS = [{
	kinds: ['discord.member.assign_roles'],
	value: z.object({
		role_ids: z.array(DISCORD_SNOWFLAKE).max(64),
		can_remove: z.boolean()
	})
}, {
	kinds: ['control_flow.cancel', 'discord.member.ban', 'discord.member.kick'],
	value: z.object({
		reason: z.string().max(256).nullable(),
		user_facing_details: z.string().max(256).nullable()
	})
}];

export const SYNC_ACTION_KINDS = SYNC_ACTION_DATA_SCHEMAS.flatMap(item => item.kinds);
export const SYNC_ACTION_UNTRANSFORMED = z.object({
	kind: z.enum(SYNC_ACTION_KINDS as [string, ...string[]]),
	criteria: CRITERIA,
	action_data: z.object({}).passthrough(),
	display_name: z.string().min(1).max(32)
});

export const SYNC_ACTION_TRANSFORMER = (value: Partial<z.infer<typeof SYNC_ACTION_UNTRANSFORMED>>, ctx: z.RefinementCtx) => {
	if (!value.kind) {
		if (!value.action_data)
			return value;
		ctx.addIssue({
			code: 'invalid_type',
			path: ['kind'],
			expected: 'string',
			received: 'undefined'
		});
		return z.NEVER;
	}

	const schema = SYNC_ACTION_DATA_SCHEMAS.find(item => item.kinds.includes(value.kind!));
	if (!schema) {
		ctx.addIssue({
			code: 'invalid_enum_value',
			options: SYNC_ACTION_KINDS,
			received: value.kind
		});
		return z.NEVER;
	}

	const result = schema.value.safeParse(value.action_data);
	if (result.success)
		return { ...value, action_data: result.data };

	for (const issue of result.error.issues)
		ctx.addIssue({
			...issue,
			path: ['action_data', ...(issue.path ?? [])]
		});
	return z.NEVER;
}

export const SYNC_ACTION = SYNC_ACTION_UNTRANSFORMED.transform(SYNC_ACTION_TRANSFORMER);

export const AUTO_IMPORT_ITEM = z.object({
	display_name: SYNC_ACTION_UNTRANSFORMED.shape.display_name
}).merge(
	z.object({
		kind: z.literal('roblox.group.role'),
		role_id: ROBLOX_ID,
		group_id: ROBLOX_ID,
		discord_role: z.discriminatedUnion('kind', [
			z.object({
				kind: z.literal('create_new'),
				name: z.string().min(1).max(100)
			}),
			z.object({
				kind: z.literal('use_existing'),
				role_id: DISCORD_SNOWFLAKE
			})
		])
	})
);

export const AUTO_IMPORT_REQUEST = z.object({
	items: z.array(AUTO_IMPORT_ITEM).max(20)
});