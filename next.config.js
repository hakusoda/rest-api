/** @type {import('next').NextConfig} */
module.exports = {
	async headers() {
		return [{
			source: '/(.*)',
			headers: [
				{ 'key': 'Access-Control-Allow-Origin', 'value': '*' },
				{ 'key': 'Access-Control-Allow-Methods', 'value': 'GET,OPTIONS,PATCH,DELETE,POST,PUT' },
				{ 'key': 'Access-Control-Allow-Headers', 'value': 'Authorization, X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version' },
				{ 'key': 'Access-Control-Allow-Credentials', 'value': 'true' }
			]
		}]
	}
};