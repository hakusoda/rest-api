import { z } from 'zod';
import { Buffer } from 'node:buffer';

import { PATCH } from '../../../../src/helpers';
import { error, status } from '../../../../src/helpers/response';
import { uploadAvatar, getRequestingUser } from '../../../../src/database';

export const config = { runtime: 'edge', regions: ['iad1'] };
export default PATCH(async request => {
	const user = await getRequestingUser(request);
	if (user instanceof Response)
		return user;

	const response = await uploadAvatar(user.id, Buffer.from(request.body));
	if (response instanceof Response)
		return response;

	if (response.error)
		return error(500, 'UPLOAD_ERROR', response.error.message);
	return status(200);
}, z.array(z.number()));