export function getLatestRelease(repository: string): Promise<GithubRelease> {
	return fetch(`${API_BASE}/repos/${repository}/releases/latest`, {
		headers: {
			Accept: 'application/vnd.github+json"',
			Authorization: `Bearer ${process.env.GITHUB_TOKEN}`
		}
	}).then(r => r.json());
}

export const API_BASE = 'https://api.github.com';

// this is not the entire format
export interface GithubRelease {
	id: number
	url: string
	name: string
	body: string
	author: GithubUser
	assets: {
		id: number
		url: string
		name: string
		size: number
		uploader: GithubUser
		created_at: string
		updated_at: string
		content_type: string
		download_count: string
		browser_download_url: string
	}[]
	tag_name: string
	html_url: string
	assets_url: string
	upload_url: string
	created_at: string
	published_at: string
}

export interface GithubUser {
	id: number
	url: string
	login: string
	html_url: string
	avatar_url: string
}