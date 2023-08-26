import type { ZodIssue } from 'zod/lib';
import { error as kitError } from '@sveltejs/kit';
export const error = (status: number, id: string, issues?: ZodIssue[]) =>
	kitError(status, { error: id, issues } as any);