import { z } from 'zod';
import { kv } from '@vercel/kv';
import base64 from '@hexagon/base64';
import { decodeMultiple } from 'cbor-x';

import { error } from '$lib/response';
import type { RequestHandler } from './$types';
import type { UserAuthSignInData } from '$lib/types';
import supabase, { handleResponse } from '$lib/supabase';
import { isCOSEPublicKeyEC2, isCOSEPublicKeyOKP, isCOSEPublicKeyRSA } from '$lib/cose';
import { parseBody, verifyEC2, concatUint8Arrays, unwrapEC2Signature } from '$lib/util';

const POST_PAYLOAD = z.object({
	id: z.string(),
	authData: z.string(),
	challenge: z.string(),
	signature: z.string(),
	clientData: z.string()
});
export const POST = (async ({ locals: { getSession }, request }) => {
	const { sub } = await getSession();
	const { id, authData, challenge, signature, clientData } = await parseBody(request, POST_PAYLOAD);

	const data = await kv.get<UserAuthSignInData>(`auth_sudo_${sub}`);
	if (!data || data.challenge !== challenge)
		throw error(400, 'invalid_body');

	const device = data.devices.find(item => item.id === id);
	if (!device)
		throw error(400, 'invalid_body');

	const authDataBuffer = new Uint8Array(base64.toArrayBuffer(authData));
	const clientDataBuffer = base64.toArrayBuffer(clientData);
	const clientDataHash = new Uint8Array(await crypto.subtle.digest('SHA-256', clientDataBuffer));

	const signatureBase = concatUint8Arrays(authDataBuffer, clientDataHash);
	const signatureBuffer = base64.toArrayBuffer(signature);

	const { public_key } = device;
	const publicKeyBuffer = base64.toArrayBuffer(public_key);
	const publicKey = (decodeMultiple(new Uint8Array(publicKeyBuffer)) as any[])[0];
	if (isCOSEPublicKeyEC2(publicKey)) {
		const unwrappedSignature = unwrapEC2Signature(new Uint8Array(signatureBuffer));
		if (!verifyEC2({
			data: signatureBase,
			publicKey,
			signature: unwrappedSignature
		}))
			throw error(400, 'invalid_body');
	/*} else if (isCOSEPublicKeyRSA(publicKey))
		return verifyRSA({ publicKey, signature, data });
	else if (isCOSEPublicKeyOKP(publicKey))
		return verifyOKP({ publicKey, signature, data });*/
	} else
		throw error(400, 'invalid_key');

	const response = await supabase.from('user_devices')
		.update({ last_used_at: new Date() })
		.eq('id', id);
	handleResponse(response);

	// TODO: make this session-based
	const response2 = await supabase.from('users')
		.update({ sudo_mode_last_entered_at: new Date() })
		.eq('id', sub);
	handleResponse(response2);

	return new Response();
}) satisfies RequestHandler;