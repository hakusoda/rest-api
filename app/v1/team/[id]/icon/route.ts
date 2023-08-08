import handler from '../../../../../lib/handler';
import { error, status } from '../../../../../lib/response';
import { hasTeamPermissions } from '../../../../../lib/util';
import { TeamRolePermission } from '../../../../../lib/enums';
import { uploadTeamAvatar, getRequestingUser } from '../../../../../lib/database';

export const runtime = 'edge';
export const PATCH = handler(async ({ body, query, headers }) => {
	const user = await getRequestingUser(headers);
	if (!user)
		return error(401, 'unauthorised');

	if (!await hasTeamPermissions(query.id, user.id, [TeamRolePermission.ManageTeam]))
		return error(403, 'no_permission');

	const response = await uploadTeamAvatar(query.id, body);
	if (response.error) {
		console.error(response.error);
		return error(500, 'database_error');
	}

	return status(200);
}, undefined, true);
export const OPTIONS = () => status(200);