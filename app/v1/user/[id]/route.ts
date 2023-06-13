import type { NextRequest } from 'next/server';

import { getUser } from '../../../../lib/database';
import { json, status } from '../../../../lib/response';

export const runtime = 'edge';
export async function GET(request: NextRequest) {
	const user = await getUser(request.nextUrl.searchParams.get('id')!);
	if (!user)
		return status(404);

	return json(user, 200, 300);
}

export const OPTIONS = () => status(200);