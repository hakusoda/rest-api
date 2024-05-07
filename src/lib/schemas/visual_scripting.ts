import { z } from 'zod';

export const VariableReference = z.object({
	path: z.string().max(32)
});

export const StatementInput = z.object({
	kind: z.enum(['match']),
	value: z.any()
}).or(z.object({
	kind: z.enum(['variable']),
	value: VariableReference
}));

export const Element: z.ZodType<any> = z.object({
	id: z.string().uuid()
}).and(
	z.object({
		kind: z.enum(['no_op.nothing'])
	})
	.or(z.object({
		kind: z.enum(['no_op.comment']),
		text: z.string().max(1000)
	}))
	.or(z.object({
		kind: z.enum(['action.mellow.member.ban', 'action.mellow.member.kick', 'action.mellow.member.sync']),
		path: z.string().max(32)
	}).and(VariableReference))
	.or(z.object({
		kind: z.enum(['action.mellow.member.roles.assign', 'action.mellow.message.reaction.create']),
		value: z.string().max(64),
		reference: VariableReference
	}))
	.or(z.object({
		kind: z.enum(['statement.if']),
		blocks: z.array(z.object({
			items: z.array(z.lazy(() => Element)).max(10),
			conditions: z.array(z.object({
				kind: z.enum(['initial', 'and', 'or']),
				inputs: z.array(StatementInput),
				condition: z.object({
					kind: z.enum([
						'generic.is', 'generic.is_not', 'generic.contains', 'generic.does_not_contain',
						'iterable.has_any_value', 'iterable.does_not_have_any_value', 'iterable.contains', 'iterable.does_not_contain', 'iterable.begins_with', 'iterable.ends_with'
					])
				}).optional()
			}))
		})).max(1)
	}))
);

export const Document = z.object({
	definition: z.array(Element).max(10)
});