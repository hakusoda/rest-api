import type { ZodIssue } from 'zod';
import { error as kitError } from '@sveltejs/kit';
import type { NumericRange } from '@sveltejs/kit';
export const error = (status: NumericRange<400, 599>, id: string, issues?: ZodIssue[]) =>
	kitError(status, { error: id, issues, message: id } as any);