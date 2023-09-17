export function isCOSEPublicKeyOKP(cosePublicKey: any[]) {
	const kty = cosePublicKey[COSEKEYS.kty];
	return isCOSEKty(kty) && kty === COSEKTY.OKP;
}

export function isCOSEPublicKeyEC2(cosePublicKey: any[]) {
	const kty = cosePublicKey[COSEKEYS.kty];
	return isCOSEKty(kty) && kty === COSEKTY.EC2;
}

export function isCOSEPublicKeyRSA(cosePublicKey: any[]) {
	const kty = cosePublicKey[COSEKEYS.kty];
	return isCOSEKty(kty) && kty === COSEKTY.RSA;
}

export function isCOSEKty(kty: number | undefined): kty is COSEKTY {
	return Object.values(COSEKTY).indexOf(kty as COSEKTY) >= 0;
}

export function mapCoseAlgToCryptoAlg(alg: COSEALG) {
	if ([COSEALG.RS1].includes(alg))
		return 'SHA-1';
	else if ([COSEALG.ES256, COSEALG.PS256, COSEALG.RS256].includes(alg))
		return 'SHA-256';
	else if ([COSEALG.ES384, COSEALG.PS384, COSEALG.RS384].includes(alg))
		return 'SHA-384';
	else if ([COSEALG.ES512, COSEALG.PS512, COSEALG.RS512, COSEALG.EdDSA].includes(alg))
	  	return 'SHA-512';
  
	throw new Error(`Could not map COSE alg value of ${alg} to a WebCrypto alg`);
}

export enum COSEALG {
	ES256 = -7,
	EdDSA = -8,
	ES384 = -35,
	ES512 = -36,
	PS256 = -37,
	PS384 = -38,
	PS512 = -39,
	ES256K = -47,
	RS256 = -257,
	RS384 = -258,
	RS512 = -259,
	RS1 = -65535
}

export enum COSEKEYS {
	kty = 1,
	alg = 3,
	crv = -1,
	x = -2,
	y = -3,
	n = -1,
	e = -2
}

export enum COSEKTY {
	OKP = 1,
	EC2,
	RSA
}

export enum COSECRV {
	P256 = 1,
	P384,
	P521,
	ED25519 = 6,
	SECP256K1 = 8
}