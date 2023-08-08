import type { NextRequest } from 'next/server';
import type { ZodAny, ZodSchema } from 'zod';

import { error } from './response';
export type Handler<T extends ZodSchema = ZodAny, A extends boolean = false> = (request: ApiRequest<T, A>) => Response | Promise<Response>
export interface ApiRequest<T extends ZodSchema = ZodAny, A extends boolean = false> {
	body: A extends true ? ArrayBuffer : T['_output']
	query: Record<string, string>
	headers: Headers
}

export default function<T extends ZodSchema, A extends boolean = false>(func: Handler<T, A>, bodySchema?: T, bodyIsBuffer?: A) {
	return async (request: NextRequest) => {
		let body;
		if (bodyIsBuffer)
			body = await request.arrayBuffer();
		else if (bodySchema) {
			let data = {};
			try { data = await request.json(); } catch(err) {}

			const result = bodySchema.safeParse(data);
			if (!result.success)
				return error(400, 'invalid_body', {
					issues: result.error.issues
				});
			body = result.data;
		}

		return func({
			body,
			query: Object.fromEntries(request.nextUrl.searchParams.entries()),
			headers: request.headers
		});
	};
}