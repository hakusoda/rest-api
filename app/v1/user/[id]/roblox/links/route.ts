import type { NextRequest } from 'next/server';

import { json, status } from '../../../../../../lib/response';
import { getUserId, getUserRobloxLinks } from '../../../../../../lib/database';

export const runtime = 'edge';
export async function GET({ nextUrl }: NextRequest) {
	const userId = await getUserId(nextUrl.searchParams.get('id')!);
	if (!userId)
		return status(404);

	const items = await getUserRobloxLinks(userId, parseInt(nextUrl.searchParams.get('type')!));
	return json(items.filter(item => item.public), 200, 300);
}
export const OPTIONS = () => status(200);