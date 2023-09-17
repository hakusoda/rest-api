export enum ApiFeatureFlag {
	None,
	ProfilePostLikes = 1 << 0,
	ProfilePostCreation = 1 << 1,
	TeamCreation = 1 << 2,
	SignIn = 1 << 3,
	SignUp = 1 << 4,
	ThirdPartySignUp = 1 << 5,
	SecurityKeys = 1 << 6
}

export enum UserNotificationState {
	Unread,
	Read
}

export enum UserRobloxLinkType {
	Account
}

export enum UserConnectionType {
	Discord,
	GitHub
}

export enum TeamAuditLogType {
	CreateTeam,
	RenameTeam,
	UpdateAvatar,
	UpdateProfile,
	CreateProject,
	UpdateProject,
	UpdateProjectAvatar,
	UpdateProjectBanner,
	CreateRole,
	UpdateRole,
	DeleteRole,
	UpdateMember,
	InviteUser
}

export enum TeamRolePermission {
	None,
	ManageTeam = 1 << 0,
	InviteUsers = 1 << 1,
	ManageMembers = 1 << 2,
	ManageRoles = 1 << 3,
	Administrator = 1 << 4
}

export enum MellowProfileSyncActionType {
	DiscordRoles,
	BanDiscord,
	KickDiscord,
	CancelSync
}
export enum MellowProfileSyncActionRequirementType {
	RobloxHasVerifiedAccount,
	RobloxHasGroupRole,
	RobloxHasGroupRankInRange,
	RobloxInGroup,
	RobloxIsFriendsWith,
	MeetOtherAction,
	VoxelifiedInTeam,
	SteamInGroup
}
export enum MellowProfileSyncActionRequirementsType {
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