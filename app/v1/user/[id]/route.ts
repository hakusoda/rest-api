import handler from '../../../../lib/handler';
import { getUser } from '../../../../lib/database';
import { json, status } from '../../../../lib/response';

export const runtime = 'edge';
export const GET = handler(async ({ query }) => {
	const user = await getUser(query.id);
	if (!user)
		return status(404);

	return json(user, 200, 300);
});

export const OPTIONS = () => status(200);