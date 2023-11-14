import { z } from 'zod';
import { kv } from '@vercel/kv';
import base64 from '@hexagon/base64';
import { json } from '@sveltejs/kit';
import { SignJWT } from 'jose';
import { decodeMultiple } from 'cbor-x';

import { error } from '$lib/response';
import type { RequestHandler } from './$types';
import type { UserAuthSignInData } from '$lib/types';
import supabase, { handleResponse } from '$lib/supabase';
import { JWT_SECRET, USERNAME_REGEX } from '$lib/constants';
import { isCOSEPublicKeyEC2, isCOSEPublicKeyOKP, isCOSEPublicKeyRSA } from '$lib/cose';
import { parseBody, verifyEC2, concatUint8Arrays, unwrapEC2Signature } from '$lib/util';

const POST_PAYLOAD = z.object({
	id: z.string(),
	auth_data: z.string(),
	username: z.string().min(3).max(20).regex(USERNAME_REGEX),
	challenge: z.string(),
	signature: z.string(),
	client_data: z.string(),
	device_public_key: z.string()
});
export const POST = (async ({ cookies, request }) => {
	const { id, auth_data, username, challenge, signature, client_data, device_public_key } = await parseBody(request, POST_PAYLOAD);

	const data = await kv.get<UserAuthSignInData>(`auth_signin_${username}`);
	if (!data || data.challenge !== challenge)
		throw error(400, 'invalid_body');

	const device = data.devices.find(item => item.id === id);
	if (!device)
		throw error(400, 'invalid_body');

	const authDataBuffer = new Uint8Array(base64.toArrayBuffer(auth_data));
	const clientDataBuffer = base64.toArrayBuffer(client_data);
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

	const token = await new SignJWT({ sub: data.id, source_device_id: id, device_public_key })
		.setProtectedHeader({ alg: 'HS256' })
		.setIssuedAt()
		.sign(JWT_SECRET);

	cookies.set('auth-token', token, { path: '/', domain: '.hakumi.cafe', expires: new Date(Date.now() + 31556926000), sameSite: 'none', httpOnly: false });

	return json({ user_id: data.id });
}) satisfies RequestHandler;