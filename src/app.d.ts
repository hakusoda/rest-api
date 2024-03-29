import type { Session, SupabaseClient } from '@supabase/supabase-js';

import type { UserSessionJWT, MellowApiKeyServer } from '$lib/types';
export interface Database {
	public: {
		Views: {}
		Tables: {}
		Functions: {}
	}
}

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			getSession<T extends boolean = true>(required?: T): Promise<T extends true ? UserSessionJWT : UserSessionJWT | null>
			getMellowServer(): Promise<MellowApiKeyServer>
		}
		// interface PageData {}
		// interface Platform {}
	}
}

export {};