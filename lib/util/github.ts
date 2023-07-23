import { AppReleaseChannel } from '../enums';
export async function getLatestRelease(repository: string, channel: string) {
	const releases: GithubRelease[] = await fetch(`${API_BASE}/repos/${repository}/releases`, {
		headers: {
			Accept: 'application/vnd.github+json"',
			Authorization: `Bearer ${process.env.GITHUB_TOKEN}`
		}
	}).then(r => r.json());
	if (channel === AppReleaseChannel.Beta) {
		const release = releases[0];
		if (release.prerelease && release.tag_name.includes('beta'))
			return release;
	}

	return releases.find(r => !r.prerelease)!;
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
	prerelease: boolean
	published_at: string
}

export interface GithubUser {
	id: number
	url: string
	login: string
	html_url: string
	avatar_url: string
}