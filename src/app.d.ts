import type { User, Session, SupabaseClient } from '@supabase/supabase-js';
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
			getUser<T extends boolean = true>(required?: T): Promise<T extends true ? User : User | null>
		}
		// interface PageData {}
		// interface Platform {}
	}
}

export { };