import { createClient } from '@supabase/supabase-js';
import type { PostgrestFilterBuilder } from '@supabase/postgrest-js';
import type { PostgrestSingleResponse } from '@supabase/supabase-js';

import { error } from './response';
import { NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';
export function header<T extends PostgrestFilterBuilder<any, any, any>>(builder: T, name: string, value: string): T {
	(builder as any).headers[name] = value;
	return builder;
}

export default createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
	auth: {
		persistSession: false,
		autoRefreshToken: false
	}
});

export function handleResponse<T extends PostgrestSingleResponse<any>>(response: T) {
	if (response.error) {
		console.error(response.error);
		throw error(500, 'database_error');
	}
	return response;
}