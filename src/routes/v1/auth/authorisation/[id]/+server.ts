import { throwIfUserNotInSudo } from '$lib/util';
import supabase, { handleResponse } from '$lib/supabase';
export const DELETE = async ({ locals: { getSession }, params: { id } }) => {
	const { sub } = await getSession();
	await throwIfUserNotInSudo(sub);

	const response = await supabase.from('application_authorisations')
		.delete()
		.eq('id', id)
		.eq('user_id', sub);
	handleResponse(response);

	return new Response();
};