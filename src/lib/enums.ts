export enum ApiFeatureFlag {
	None,
	___ = 1 << 0,
	____ = 1 << 1,
	TeamCreation = 1 << 2,
	SignIn = 1 << 3,
	SignUp = 1 << 4,
	ThirdPartySignUp = 1 << 5,
	SecurityKeys = 1 << 6
}

export enum UserFlag {
	None,
	Staff = 1 << 1,
	Tester = 1 << 2
}

export enum UserNotificationState {
	Unread,
	Read
}

export enum UserConnectionType {
	Discord,
	GitHub,
	Roblox,
	YouTube,
	Patreon
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
	GiveRoles,
	BanFromServer,
	KickFromServer,
	CancelSync
}
export enum MellowProfileSyncActionRequirementType {
	RobloxHaveConnection,
	RobloxHaveGroupRole,
	RobloxHaveGroupRankInRange,
	RobloxInGroup,
	RobloxBeFriendsWith,
	MeetOtherAction,
	HAKUMIInTeam,
	SteamInGroup,
	RobloxHaveAsset,
	RobloxHaveBadge,
	RobloxHavePass,
	GitHubInOrganisation,
	PatreonHaveCampaignTier
}
export enum MellowProfileSyncActionRequirementsType {
	MeetAll,
	MeetOne
}

export enum MellowServerLogType {
	None,
	ActionLog = 1 << 0,
	ServerProfileSync = 1 << 1,
	VisualScriptingDocumentResult = 1 << 3
}