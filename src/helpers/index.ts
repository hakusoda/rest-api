import { error } from './response';
export interface WrappedRequest extends Request {
	query: Record<string, string>
}
export type Handler = (request: WrappedRequest) => Response | Promise<Response>
export type WrappedHandler = (request: Request) => Response | Promise<Response>
export function handler(methods: string[], handler: Handler): WrappedHandler {
	return (req: Request) => {
		if (!methods.includes(req.method))
			return error(405, 'METHOD_NOT_ALLOWED');
		return handler({
			...req,
			query: Object.fromEntries(new URL(req.url).searchParams.entries())
		});
	};
}

export function GET(func: Handler) {
	return handler(['GET'], func);
}
export function POST(func: Handler) {
	return handler(['POST'], func);
}