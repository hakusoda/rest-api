import { GET } from '../../../../../src/helpers';
import { json, error } from '../../../../../src/helpers/response';
import { getUserId, getUserRobloxLinks } from '../../../../../src/database';

export const config = { runtime: 'edge', regions: ['iad1'] };
export default GET(async request => {
	const userId = await getUserId(request.query.id);
	if (!userId)
		return error(404, 'NOT_FOUND');

	const items = await getUserRobloxLinks(userId, parseInt(request.query.type));
	return json(items.filter(item => item.public), 200, 300);
});