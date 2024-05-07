import { fetchJson } from './util';
import { MELLOW_TOKEN } from '$env/static/private';
export interface DiscordRole {
	id: string
}

export async function create_guild_role(guild_id: string, name: string): Promise<DiscordRole> {
	return fetchJson(`https://discord.com/api/v10/guilds/${guild_id}/roles`, {
		body: JSON.stringify({ name }),
		method: 'POST',
		headers: {
			authorization: `Bot ${MELLOW_TOKEN}`,
			'content-type': 'application/json'
		}
	});
}