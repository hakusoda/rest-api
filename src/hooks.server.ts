import type { Handle } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';

import supabase from '$lib/supabase';
import { error } from '$lib/response';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { SUPABASE_SERVICE_ROLE } from '$env/static/private';

const COOKIE_NAME = 'sb-gzlrrsjtbzflasxukxki-auth-token';
export const handle = (async ({ event, resolve }) => {
	event.locals.getUser = async (required: boolean = true) => {
		const cookie = event.cookies.get(COOKIE_NAME);
		
		let jwt = event.request.headers.get('authorization')?.split(' ')[1] || cookie?.match(/"(.*?)"/)?.[1];
		if (!jwt) {
			if (required)
				throw error(401, 'unauthorised');
			return null as any;
		}

		if (cookie) {
			const refresh_token = cookie.match(/,"(.*?)"/)?.[1];
			if (refresh_token) {
				const client = createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
					auth: {
						persistSession: false,
						autoRefreshToken: false
					}
				});
				const response = await client.auth.refreshSession({ refresh_token });
				if (response.error) {
					console.error(response.error);
					throw error(500, 'auth_refresh_error');
				}

				const session = response.data.session!;
				jwt = session.access_token;

				console.log(response.data.session);
				event.cookies.set(COOKIE_NAME, JSON.stringify([
					session.access_token,
					session.refresh_token,
					null, // unknown
					null, // unknown
					response.data.user!.factors
				]), {
					path: '/'
				});
			}
		}
		
		const response = await supabase.auth.getUser(jwt);
		if (!response.data && required)
			throw error(401, 'unauthorised');
		if (response.error) {
			console.error(response.error);
			throw error(500, 'auth_error');
		}

		return response.data.user;
	};
	
	return resolve(event, {
		filterSerializedResponseHeaders: name => name === 'content-range'
	});
}) satisfies Handle;