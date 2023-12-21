import { json } from '@sveltejs/kit';
import type { ZodType } from 'zod';

import { error } from '$lib/response';
import type { RequestHandler } from './$types';
import supabase, { handleResponse } from '$lib/supabase';
import { MELLOW_SERVER_PROFILE_SYNC_ACTION_PAYLOAD_TRANSFORMER, MELLOW_SERVER_PROFILE_SYNC_ACTION_PAYLOAD_UNTRANSFORMED } from '$lib/constants';
import { parseBody, createMellowServerAuditLog, isUserMemberOfMellowServer } from '$lib/util';
export const PATCH = (async ({ locals: { getSession }, params: { id, action_id }, request }) => {
	const session = await getSession();
	if (!await isUserMemberOfMellowServer(session.sub, id))
		throw error(403, 'no_permission');

	const response = await supabase.from('mellow_binds')
		.select('id, name, type, metadata, creator:users ( name, username ), created_at, requirements:mellow_bind_requirements ( id, type, data ), requirements_type')
		.eq('id', action_id)
		.eq('server_id', id)
		.limit(1)
		.single();
	handleResponse(response);

	const body = await parseBody(request, (MELLOW_SERVER_PROFILE_SYNC_ACTION_PAYLOAD_UNTRANSFORMED.partial() as ZodType).transform(v => ({ ...v, type: v.type ?? response.data!.type })).transform(MELLOW_SERVER_PROFILE_SYNC_ACTION_PAYLOAD_TRANSFORMER));
	const author = await supabase.from('users')
		.select('name, username')
		.eq('id', session.sub)
		.limit(1)
		.single();
	handleResponse(author);

	let final = {
		...response.data!,
		last_edit: {
			type: '',
			author: author.data!,
			created_at: Date.now()
		}
	};
	if (body.name !== undefined || body.type !== undefined || body.metadata !== undefined || body.requirements_type !== undefined) {
		const response2 = await supabase.from('mellow_binds')
			.update({
				name: body.name,
				type: body.type,
				metadata: body.metadata,
				requirements_type: body.requirements_type
			})
			.eq('id', action_id)
			.eq('server_id', id)
			.select('id, name, type, metadata, creator:users ( name, username ), created_at, requirements_type')
			.single();
		handleResponse(response2);

		final = {
			...final,
			...response2.data
		};
	}

	if (body.requirements) {
		const response3 = await supabase.from('mellow_bind_requirements')
			.delete()
			.eq('bind_id', action_id);
		handleResponse(response3);

		if (body.requirements.length) {
			const response4 = await supabase.from('mellow_bind_requirements')
				.insert(body.requirements.map(item => ({
					...item,
					bind_id: action_id
				})))
				.select('id, type, data');
			handleResponse(response4);

			final.requirements = response4.data!;
		} else
			final.requirements = [];
	}

	await createMellowServerAuditLog('mellow.server.syncing.action.updated', session.sub, id, {
		name: [response.data!.name, body.name],
		type: [response.data!.type, body.type],
		metadata: [response.data!.metadata, body.metadata],
		requirements: [response.data!.requirements, body.requirements],
		requirements_type: [response.data!.requirements_type, body.requirements_type]
	}, action_id);

	return json(final);
}) satisfies RequestHandler;
export const DELETE = (async ({ locals: { getSession }, params: { id, action_id } }) => {
	const session = await getSession();
	if (!await isUserMemberOfMellowServer(session.sub, id))
		throw error(403, 'no_permission');

	const response = await supabase.from('mellow_binds')
		.delete()
		.eq('id', action_id)
		.eq('server_id', id)
		.select('name');
	handleResponse(response);

	await createMellowServerAuditLog('mellow.server.syncing.action.deleted', session.sub, id, {
		name: response.data![0].name
	});

	return new Response();
}) satisfies RequestHandler;