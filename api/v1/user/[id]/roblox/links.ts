import { GET } from '../../../../../src/helpers';
import { json, error } from '../../../../../src/helpers/response';
import { getUserId, getUserRobloxLinks } from '../../../../../src/database';

export const config = { runtime: 'edge', regions: ['iad1'] };
export default GET(async request => {
	const userId = await getUserId(request.query.id);
	if (!userId)
		return error(404, 'NOT_FOUND');

	return json(await getUserRobloxLinks(userId, parseInt(request.query.type)), 200, 60000);
});