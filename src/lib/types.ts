export interface UserAuthSignUpData {
	id: string
	username: string
	challenge: string
}

export interface UserAuthSignInData {
	id: string
	devices: {
		id: string
		public_key: string
		transports: string[]
	}[]
	challenge: string
}

export interface UserAddDeviceData {
	challenge: string
}

export interface UserSessionJWT {
	sub: string
	iat: number
	exp: number
}