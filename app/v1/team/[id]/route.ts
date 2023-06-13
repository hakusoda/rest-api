import type { NextRequest } from 'next/server';

import { getTeam } from '../../../../lib/database';
import { json, status } from '../../../../lib/response';

export const runtime = 'edge';
export async function GET(request: NextRequest) {
	const team = await getTeam(request.nextUrl.searchParams.get('id')!);
	if (!team)
		return status(404);

	return json(team, 200, 300);
}
export const OPTIONS = () => status(200);