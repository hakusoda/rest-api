import type { ZodAny, ZodSchema } from 'zod';

import { error } from './response';
import { UUID_REGEX } from './constants';
import { TeamRolePermission } from './enums';
import supabase, { handleResponse } from './supabase';
import type { TeamAuditLogType, MellowServerAuditLogType } from './enums';
export const isUUID = (uuid: string) => UUID_REGEX.test(uuid);
export const hasBit = (bits: number, bit: number) => (bits & bit) === bit;

export async function parseBody<T extends ZodSchema = ZodAny>(request: Request, schema: T): Promise<T['_output']> {
	const result = schema.safeParse(await request.json());
	if (!result.success)
		throw error(400, 'invalid_body', result.error.issues);

	return result.data;
}

export async function hasTeamPermissions(teamId: string, userId: string, permissions: TeamRolePermission[]) {
	const response = await supabase.from('team_members')
		.select<string, {
			role: {
				permissions: number
			} | null
			team: {
				owner_id: string | null
			}
		}>('role:team_roles ( permissions ), team:teams ( owner_id )')
		.eq('user_id', userId)
		.eq('team_id', teamId)
		.limit(1)
		.maybeSingle();
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

export async function createTeamAuditLog(type: TeamAuditLogType, author_id: string, team_id: string, data?: any, target_role_id?: string, target_user_id?: string) {
	const { error } = await supabase.from('team_audit_logs').insert({
		type,
		data,
		team_id,
		author_id,
		target_role_id,
		target_user_id
	});
	if (error)
		console.error(error);
}

export async function createMellowServerAuditLog(type: MellowServerAuditLogType, author_id: string, server_id: string, data?: any, target_link_id?: string) {
	const { error } = await supabase.from('mellow_server_audit_logs').insert({
		type,
		data,
		author_id,
		server_id,
		target_link_id
	});
	if (error)
		console.error(error);
}

export async function isUserMemberOfMellowServer(userId: string, serverId: string) {
	const response = await supabase.from('mellow_server_members')
		.select('*', { head: true, count: 'exact' })
		.eq('user_id', userId)
		.eq('server_id', serverId)
		.limit(1)
		.maybeSingle();
	handleResponse(response);

	return !!response.count;
}