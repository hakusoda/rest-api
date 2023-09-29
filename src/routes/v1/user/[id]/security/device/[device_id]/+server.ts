import { error } from '$lib/response';
import { ApiFeatureFlag } from '$lib/enums';
import type { RequestHandler } from './$types';
import supabase, { handleResponse } from '$lib/supabase';
import { throwIfUserNotInSudo, throwIfFeatureNotEnabled } from '$lib/util';
export const DELETE = (async ({ locals: { getSession }, params: { id, device_id } }) => {
	await throwIfFeatureNotEnabled(ApiFeatureFlag.SecurityKeys);

	const { sub } = await getSession();
	if (sub !== id)
		throw error(403, 'forbidden');
	await throwIfUserNotInSudo(sub);

	const response = await supabase.from('user_devices')
		.delete({ count: 'exact' })
		.eq('id', device_id)
		.eq('user_id', id);
	handleResponse(response);

	if (!response.count)
		throw error(404, 'security_device_not_found');
	return new Response();
}) satisfies RequestHandler;
