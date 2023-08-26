import { createClient } from '@supabase/supabase-js';
import type { PostgrestSingleResponse } from '@supabase/supabase-js';

import { error } from './response';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { SUPABASE_SERVICE_ROLE } from '$env/static/private';
export default createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
	auth: {
		persistSession: false,
		autoRefreshToken: false
	}
});

export function handleResponse(response: PostgrestSingleResponse<any>) {
	if (response.error) {
		console.log(response.error);
		throw error(500, 'database_error');
	}
}