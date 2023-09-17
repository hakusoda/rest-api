import base64 from '@hexagon/base64';
import { UAParser } from 'ua-parser-js';
import { AsnParser } from '@peculiar/asn1-schema';
import { ECDSASigValue } from '@peculiar/asn1-ecc';
import type { ZodAny, ZodSchema } from 'zod';
import { decode, encode, decodeMultiple } from 'cbor-x';

import { error } from './response';
import { UUID_REGEX } from './constants';
import { TeamRolePermission } from './enums';
import supabase, { handleResponse } from './supabase';
import { COSECRV, COSEKEYS, mapCoseAlgToCryptoAlg } from './cose';
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

export function readAttestation(attestation: string) {
	let pointer = 0;
	const data = new Uint8Array(decode(new Uint8Array(base64.toArrayBuffer(attestation))).authData);
	const dataView = new DataView(data.buffer, data.byteOffset, data.length);

	const rpIdHash = data.slice(pointer, pointer += 32);

	const flagsBuf = data.slice(pointer, pointer += 1);
	const flagsInt = flagsBuf[0];

	const flags = {
		up: !!(flagsInt & (1 << 0)),
		uv: !!(flagsInt & (1 << 2)),
		be: !!(flagsInt & (1 << 3)),
		bs: !!(flagsInt & (1 << 4)),
		at: !!(flagsInt & (1 << 6)),
		ed: !!(flagsInt & (1 << 7)),
		flagsInt,
	};

	const counterBuf = data.slice(pointer, pointer + 4);
	const counter = dataView.getUint32(pointer, false);
	pointer += 4;

	let id: string | undefined = undefined;
	let aaguid: string | undefined = undefined;
	let publicKey: string | undefined = undefined;

	if (flags.at) {
		aaguid = base64.fromArrayBuffer(data.slice(pointer, pointer += 16));

		const credIDLen = dataView.getUint16(pointer);
		pointer += 2;

		id = base64.fromArrayBuffer(data.slice(pointer, pointer += credIDLen));

		const decoded = decodeMultiple(new Uint8Array(data.slice(pointer))) as any[];

		const firstEncoded = Uint8Array.from(encode(decoded[0]));
		publicKey = base64.fromArrayBuffer(firstEncoded);
		pointer += firstEncoded.byteLength;
	}

	return { id, aaguid, publicKey };
}

export function concatUint8Arrays(...arrays: Uint8Array[]) {
	let pointer = 0;
	const totalLength = arrays.reduce((prev, curr) => prev + curr.length, 0);
	const toReturn = new Uint8Array(totalLength);
	for (const array of arrays) {
		toReturn.set(array, pointer);
	  	pointer += array.length;
	}
  
	return toReturn;
}

export async function verifyEC2(opts: {
	data: Uint8Array
	publicKey: any[]
	signature: Uint8Array
}): Promise<boolean> {
	const { data, publicKey, signature } = opts;

	const alg = publicKey[COSEKEYS.alg];
	const crv = publicKey[COSEKEYS.crv];
	const x = publicKey[COSEKEYS.x];
	const y = publicKey[COSEKEYS.y];
	if (!alg)
		throw new Error('Public key was missing alg (EC2)');

	if (!crv)
		throw new Error('Public key was missing crv (EC2)');

	if (!x)
		throw new Error('Public key was missing x (EC2)');

	if (!y)
		throw new Error('Public key was missing y (EC2)');

	let _crv: any;
	if (crv === COSECRV.P256)
		_crv = 'P-256';
	else if (crv === COSECRV.P384)
		_crv = 'P-384';
	else if (crv === COSECRV.P521)
		_crv = 'P-521';
	else
		throw new Error(`Unexpected COSE crv value of ${crv} (EC2)`);

	const keyData: JsonWebKey = {
		x: base64.fromArrayBuffer(x),
		y: base64.fromArrayBuffer(y),
		kty: 'EC',
		crv: _crv,
		ext: false
	};

	const keyAlgorithm: EcKeyImportParams = {
		name: 'ECDSA',
		namedCurve: _crv
	};

	const key = await importKey(keyData, keyAlgorithm);
	const subtleAlg = mapCoseAlgToCryptoAlg(alg);
	const verifyAlgorithm: EcdsaParams = {
		name: 'ECDSA',
		hash: { name: subtleAlg }
	};

	return crypto.subtle.verify(verifyAlgorithm, key, signature, data);
}

export function importKey(keyData: JsonWebKey, algorithm: AlgorithmIdentifier | RsaHashedImportParams | EcKeyImportParams) {
	return crypto.subtle.importKey('jwk', keyData, algorithm, false, ['verify']);
}

export function unwrapEC2Signature(signature: Uint8Array) {
	const parsedSignature = AsnParser.parse(signature, ECDSASigValue);
	let rBytes = new Uint8Array(parsedSignature.r);
	let sBytes = new Uint8Array(parsedSignature.s);
  
	if (shouldRemoveLeadingZero(rBytes))
	  	rBytes = rBytes.slice(1);
	if (shouldRemoveLeadingZero(sBytes))
	  	sBytes = sBytes.slice(1);
  
	const finalSignature = concatUint8Arrays(rBytes, sBytes);
  
	return finalSignature;
}

const shouldRemoveLeadingZero = (bytes: Uint8Array) => bytes[0] === 0x0 && (bytes[1] & (1 << 7)) !== 0;

export async function createRefreshToken(user_id: string) {
	const token = new Uint32Array(64);
	crypto.getRandomValues(token);

	const refresh_token = base64.fromArrayBuffer(token);
	const response = await supabase.from('user_refresh_tokens')
		.insert({ user_id, refresh_token });
	handleResponse(response);

	return refresh_token;
}

const BROWSER_NAME_MAP: Record<string, string> = {
	Edge: 'Microsoft Edge',
	Chrome: 'Google Chrome',
	Safari: 'Apple Safari',
	'Mobile Safari': 'Apple Safari'
};
export function getRequestOrigin(request: Request, platformVersion = '10.0.0') {
	const user_agent = request.headers.get('user-agent') ?? '';
	const parsedAgent = UAParser(user_agent);

	const user_platform = parsedAgent.browser.name;
	return {
		user_ip: request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for'),
		user_os: `${user_agent.includes('iPhone') ? 'iOS' : user_agent.includes('iPad') ? 'iPadOS' : parsedAgent.os.name} ${parsedAgent.os.name === 'Windows' && platformVersion?.split('.')[0] as any >= 13 ? 11 : parsedAgent.os.version}`,
		user_agent,
		user_country: request.headers.get('cf-ipcountry') || request.headers.get('x-vercel-ip-country'),
		user_platform: BROWSER_NAME_MAP[user_platform!] ?? user_platform
	};
}