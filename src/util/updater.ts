import type { GithubRelease } from "./github";
export async function getPlatforms(release: GithubRelease) {
	const data = {};
	for (const { name, browser_download_url } of release.assets) {
		const platform = Object.keys(platforms).find(p => browser_download_url.match(p));
		if (platform)
			data[platforms[platform]] = {
				url: browser_download_url,
				signature: await getSignature(name, release.assets)
			};
	}
	return data;
}

export function getSignature(name: string, assets: any[]) {
    const signature = assets.find(asset => asset.name === `${name}.sig`);
    if (!signature)
        return null;

    return fetch(signature.browser_download_url).then(r => r.text());
}

export const platforms = {
	'\.msi\.zip$': 'windows-x86_64',
	'\.deb\.tar\.gz$': 'linux-x86_64',
	'\.AppImage\.tar\.gz$': 'linux-x86_64'
};
export const repositories = {
	mdpkm: 'Blookerss/mdpkm'
};