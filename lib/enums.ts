export enum AppReleaseChannel {
	Stable = 'stable',
	Beta = 'beta'
}

export enum UserNotificationState {
	Unread,
	Read
}

export enum TeamRolePermission {
	None,
	ManageTeam = 1 << 0,
	InviteUsers = 1 << 1
}

export enum MellowRobloxLinkType {
	DiscordRoles
}
export enum MellowRobloxLinkRequirementType {
	HasVerifiedUserLink,
	HasRobloxGroupRole,
	HasRobloxGroupRankInRange,
	InRobloxGroup,
	IsFriendsWith,
	MeetsOtherLink
}
export enum MellowRobloxLinkRequirementsType {
	MeetAll,
	MeetOne
}

export enum MellowServerAuditLogType {
	CreateServer,
	CreateRobloxLink,
	UpdateRobloxGlobalSettings,
	DeleteRobloxLink,
	UpdateRobloxLink,
	UpdateLogging
}