export interface RobloxLink {
	id: string
	type: RobloxLinkType
	owner: string
	flags: number
	public: boolean
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

export interface ApiUser {
	id: string
	bio: string | null
	name: string | null
	flags: number
	username: string
	avatar_url: string
	created_at: string
}
export interface ApiTeam {
	id: string
	bio: string
	name: string
	flags: number
	members: {
		role: number
		user: ApiUser
		joined_at: number
	}[]
	avatar_url: string
	created_at: string
	display_name: string
}

export interface Database {
	public: {
		Tables: {
			users: {
				Row: {
					id: string
					bio: string | null
					name: string | null
					flags: number
					username: string
					created_at: string
					mellow_ids: string[]
					mellow_pending: boolean
				}
				Insert: {}
				Update: {}
			}
			teams: {
				Row: {
					id: string
					bio: string
					name: string
					created_at: string
					display_name: string
				}
				Insert: {}
				Update: {}
			}
			team_members: {
				Row: {
					id: string
					role: number
					user_id: string
					team_id: string
					joined_at: string
				}
				Insert: {}
				Update: {}
			}
		}
	}
}