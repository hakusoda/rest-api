export interface User {
	id: string
	bio: string | null
	name: string | null
	flags: number
	username: string
	avatar_url: string

	created: string
}

export interface RobloxLink {
	id: string
	type: RobloxLinkType
	owner: string

	platform: Platform
	platform_id: string
	
	target_id: number
	
	created_at: string
}

export enum RobloxLinkType {
	User,
	GroupRole
}

export enum Platform {
	Discord
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