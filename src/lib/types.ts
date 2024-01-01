export interface UserAuthSignUpData {
	id: string
	username: string
	challenge: string
}

export interface UserAuthSignInData {
	id: string
	devices: {
		id: string
		public_key: string
		transports: string[]
	}[]
	challenge: string
}

export interface UserAddDeviceData {
	challenge: string
}

export interface UserSessionJWT {
	sub: string
	iat: number
	device_public_key: string
}

export interface MellowApiKeyServer {
	id: string
}

export interface UserConnectionCallbackResponse {
	sub: string
	name?: string | null
	username: string
	avatar_url?: string | null
	website_url?: string | null
}

export type TeamActionLogType =
	'team.created' |
	'team.renamed' |
	'team.avatar.updated' |
	'team.public_profile.updated' |
	'team.role.created' |
	'team.role.updated' |
	'team.role.deleted' |
	'team.member.updated' |
	'team.member_invitation.created' |
	'team.mellow_server.transferred.to_here'

export type MellowActionLogItemType =
	'mellow.server.created' |
	'mellow.server.syncing.action.created' |
	'mellow.server.syncing.action.updated' |
	'mellow.server.syncing.action.deleted' |
	'mellow.server.syncing.settings.updated' |
	'mellow.server.discord_logging.updated' |
	'mellow.server.api_key.created' |
	'mellow.server.ownership.changed'