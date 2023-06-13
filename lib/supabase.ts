import { createClient } from '@supabase/supabase-js';

import type { Database } from './types';
export const supabase = createClient<Database>('https://gzlrrsjtbzflasxukxki.supabase.co', process.env.SUPABASE_SERVICE_ROLE!, {
	auth: {
		persistSession: false,
		autoRefreshToken: false
	}
});