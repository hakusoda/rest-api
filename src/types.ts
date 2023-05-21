export interface User {
	id: string
	bio: string | null
	name: string | null
	flags: number
	username: string
	avatar_url: string

	created: string
}

export interface Database {
	public: {
		Tables: {
			users: {
				Row: User
				Insert: {}
				Update: {}
			}
		}
	}
}