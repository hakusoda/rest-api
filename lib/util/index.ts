import { supabase } from '../supabase';
import { TeamRolePermission } from '../enums';
export const uuidRegex = /^\w{8}-\w{4}-\w{4}-\w{4}-\w{12}$/;

export const isUUID = (uuid: string) => uuidRegex.test(uuid);
export const hasBit = (bits: number, bit: number) => (bits & bit) === bit;

export async function hasTeamPermissions(teamId: string, userId: string, permissions: TeamRolePermission[]) {
	const response = await supabase.from('team_members').select<string, {
		role: {
			permissions: number
		} | null
		team: {
			owner_id: string | null
		}
	}>('role:team_roles ( permissions ), team:teams ( owner_id )').eq('user_id', userId).eq('team_id', teamId).limit(1).maybeSingle();
	if (response.error) {
		console.error(response.error);
		return false;
	}

	if (!response.data)
		return false;
	if (userId === response.data.team.owner_id)
		return true;

	if (!response.data.role)
		return false;

	if (hasBit(response.data.role.permissions, TeamRolePermission.Administrator))
		return true;
	for (const bit of permissions)
		if (!hasBit(response.data.role.permissions, bit))
			return false;
	return true;
}