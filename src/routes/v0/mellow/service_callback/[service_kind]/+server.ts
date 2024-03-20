import { redirect } from '@sveltejs/kit';

import { error } from '$lib/response';
import { WEBSITE_URL } from '$lib/constants';
import { PATREON_OAUTH_SECRET } from '$env/static/private';
import supabase, { handleResponse } from '$lib/supabase';
import { fetchJson, isUserMemberOfMellowServer } from '$lib/util';
export async function GET({ url, locals: { getSession }, params: { service_kind } }) {
	if (service_kind !== '0')
		throw error(400, 'invalid_service');

	const session = await getSession(true);
	const code = url.searchParams.get('code');
	const state = url.searchParams.get('state');
	if (!code || !state)
		throw error(400, 'invalid_query');

	if (!await isUserMemberOfMellowServer(session.sub, state))
		throw error(403, 'no_permission');

	const { scope, expires_in, token_type, access_token, refresh_token } = await fetchJson(`https://www.patreon.com/api/oauth2/token?client_id=BaKp_8PIeBxx0cfJoEEaVxVQMxD3c_IUFS_qCSu5gNFnXLL5c4Qw4YMPtgMJG-n9&client_secret=${PATREON_OAUTH_SECRET}&code=${code}&redirect_uri=${encodeURIComponent(`https://${url.hostname}${url.pathname}`)}&grant_type=authorization_code`, {
		method: 'POST',
		headers: {
			'content-type': 'application/x-www-form-urlencoded'
		}
	});

	const { data: [ campaign ] } = await fetchJson('https://www.patreon.com/api/oauth2/v2/campaigns', {
		headers: {
			'authorization': `${token_type} ${access_token}`
		}
	});

	console.log(await fetchJson('https://www.patreon.com/api/oauth2/v2/webhooks', {
		body: JSON.stringify({
			data: {
				type: 'webhook',
				attributes: {
					uri: 'https://mellow-internal-api.hakumi.cafe/patreon_webhook',
					//uri: 'https://local-mellow.hakumi.cafe/patreon_webhook',
					triggers: ['members:create', 'members:update', 'members:delete']
				},
				relationships: {
					campaign: {
						data: {
							id: campaign.id,
							type: 'campaign'
						}
					}
				}
			}
		}),
		method: 'POST',
		headers: {
			'content-type': 'application/json',
			'authorization': `${token_type} ${access_token}`
		}
	}));

	handleResponse(await supabase.from('mellow_server_oauth_authorisations')
		.insert({
			kind: service_kind,
			scopes: (scope as string).split(' '),
			server_id: state,
			expires_at: new Date(Date.now() + expires_in * 1000),
			token_type,
			access_token,
			refresh_token,
			patreon_campaign_id: campaign.id
		})
	);

	throw redirect(302, `${WEBSITE_URL}/mellow/server/${state}/settings/syncing`);
}