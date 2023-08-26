import { createClient } from '@supabase/supabase-js';
import type { PostgrestSingleResponse } from '@supabase/supabase-js';

import { error } from './response';
import { NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';
export default createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
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