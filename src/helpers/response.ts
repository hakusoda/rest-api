export function text(text: string) {
	return new Response(text);
}

export function json(json: any, status: number = 200, maxAge?: number) {
	return new Response(JSON.stringify(json), {
		status,
		headers: {
			'Content-Type': 'application/json',
			...maxAge && { 'Cache-Control': `s-maxage=${maxAge}` }
		}
	})
}

export function status(code: number) {
	return new Response(null, { status: code });
}

export function error(code: number, id: string, details?: any) {
	return json({
		error: true,
		error_id: id,
		details
	}, code);
}