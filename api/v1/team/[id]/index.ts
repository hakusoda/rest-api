import { GET } from '../../../../src/helpers';
import { getTeam } from '../../../../src/database';
import { json, error } from '../../../../src/helpers/response';

export const config = { runtime: 'edge', regions: ['iad1'] };
export default GET(async request => {
	const team = await getTeam(request.query.id);
	if (!team)
		return error(404, 'NOT_FOUND');

	return json(team, 200, 300);
});