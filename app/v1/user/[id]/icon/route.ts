import { error, status } from '../../../../../lib/response';
import { uploadAvatar, getRequestingUser } from '../../../../../lib/database';

export const runtime = 'edge';
export async function PATCH(request: Request) {
	const user = await getRequestingUser(request.headers);
	if (!user)
		return error(401, 'unauthorised');

	const response = await uploadAvatar(user.id, await request.arrayBuffer());
	if (response.error) {
		console.error(response.error);
		return error(500, 'database_error');
	}

	return status(200);
}
export const OPTIONS = () => status(200);