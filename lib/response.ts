export function text(text: string) {
	return new Response(text);
}

export function json(json: any, status: number = 200, maxAge?: number) {
	return new Response(JSON.stringify(json), {
		status,
		headers: {
			'Content-Type': 'application/json',
			...maxAge && { 'Cache-Control': `public, s-maxage=${maxAge}, stale-while-revalidate=600` }
		}
	})
}

export function status(code: number) {
	return new Response(null, { status: code });
}

export function error(code: number, errorId: string, extraData?: Record<any, any>) {
	return json({
		error: errorId,
		...extraData
	}, code);
}