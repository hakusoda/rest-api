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

export interface UserConnectionCallbackResponse {
	sub: string
	name?: string | null
	metadata: any
	username: string
	avatar_url?: string | null
	website_url?: string | null
}