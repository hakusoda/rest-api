import { z } from 'zod';
import { kv } from '@vercel/kv';
import base64 from '@hexagon/base64';
import { json } from '@sveltejs/kit';
import { SignJWT } from 'jose';
import { decodeMultiple } from 'cbor-x';

import { error } from '$lib/response';
import type { RequestHandler } from './$types';
import type { UserAuthSignInData } from '$lib/types';
import { JWT_SECRET, USERNAME_REGEX } from '$lib/constants';
import { isCOSEPublicKeyEC2, isCOSEPublicKeyOKP, isCOSEPublicKeyRSA } from '$lib/cose';
import { parseBody, verifyEC2, concatUint8Arrays, createRefreshToken, unwrapEC2Signature } from '$lib/util';

const POST_PAYLOAD = z.object({
	id: z.string(),
	authData: z.string(),
	username: z.string().min(3).max(20).regex(USERNAME_REGEX),
	challenge: z.string(),
	signature: z.string(),
	clientData: z.string()
});
export const POST = (async ({ cookies, request }) => {
	const { id, authData, username, challenge, signature, clientData } = await parseBody(request, POST_PAYLOAD);

	const data = await kv.get<UserAuthSignInData>(`auth_signin_${username}`);
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

	const token = await new SignJWT({ sub: data.id })
		.setProtectedHeader({ alg: 'HS256' })
		.setIssuedAt()
		.setExpirationTime('1h')
		.sign(JWT_SECRET);

	const refresh = await createRefreshToken(data.id);
	const cookieOptions = { path: '/', domain: '.voxelified.com', expires: new Date(Date.now() + 31556926000), sameSite: 'none', httpOnly: false } as const;
	cookies.set('auth-token', token, cookieOptions);
	cookies.set('refresh-token', refresh, cookieOptions);

	return json({ user_id: data.id });
}) satisfies RequestHandler;