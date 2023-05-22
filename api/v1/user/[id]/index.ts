import { GET } from '../../../../src/helpers';
import { getUser } from '../../../../src/database';
import { json, error } from '../../../../src/helpers/response';

export const config = { runtime: 'edge', regions: ['iad1'] };
export default GET(async request => {
	const user = await getUser(request.query.id);
	if (!user)
		return error(404, 'NOT_FOUND');

	return json(user, 200, 300);
});