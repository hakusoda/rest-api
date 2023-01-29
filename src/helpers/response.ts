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

export function error(code: number, id: string) {
	return json({
		error: true,
		error_id: id
	}, code);
}