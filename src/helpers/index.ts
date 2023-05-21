import type { ZodSchema, ZodAny } from 'zod/lib';

import { error, status } from './response';
export interface WrappedRequest<T extends ZodSchema = ZodAny> extends Request {
	body: T['_output']
	query: Record<string, string>
}
export type Handler<T extends ZodSchema = ZodAny> = (request: ApiRequest<T>) => Response | Promise<Response>

export interface ApiRequest<T extends ZodSchema = ZodAny> {
	body: T['_output']
	query: Record<string, string>
	headers: Headers
}
export function handler<T extends ZodSchema>(methods: string[], func: Handler<T>, bodySchema?: T) {
	return async (request: Request) => {
		if (request.method === 'OPTIONS')
			return status(200);
		if (!methods.includes(request.method))
			return error(405, 'METHOD_NOT_ALLOWED');
		
		let body;
		if (bodySchema) {
			const result = bodySchema.safeParse(await request.json());
			if (!result.success)
				return error(400, 'INVALID_BODY', result.error.errors);
			body = result.data;
		}

		return func({
			body,
			query: Object.fromEntries(new URL(request.url, 'https://example.com').searchParams.entries()),
			headers: request.headers
		});
	};
}

export function GET(func: Handler) {
	return handler(['GET'], func);
}
export function POST<T extends ZodSchema>(func: Handler<T>, bodySchema?: T) {
	return handler(['POST'], func, bodySchema);
}
export function PATCH<T extends ZodSchema>(func: Handler<T>, bodySchema?: T) {
	return handler(['PATCH'], func, bodySchema);
}