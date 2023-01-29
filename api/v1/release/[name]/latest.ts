import { GET } from '../../../../src/helpers';
import { json, error } from '../../../../src/helpers/response';

export const config = { runtime: 'edge' };
export default GET(async request => {
	const { name } = request.query;
	const repository = repositories[name];
	if (!repository)
		return error(400, 'INVALID_REPOSITORY');

	const release = await fetch(`https://api.github.com/repos/${repository}/releases/latest`, {
		headers: {
			Accept: 'application/vnd.github+json"',
			Authorization: `Bearer ${process.env.GITHUB_TOKEN}`
		}
	}).then(r => r.json());

	const data = {
		title: release.tag_name,
		body: release.body,
		platforms: {},
		date_published: release.published_at
	};
	for (const { name, browser_download_url } of release.assets) {
		const platform = Object.keys(platforms).find(p => browser_download_url.match(p));
		if (platform)
			data.platforms[platforms[platform]] = {
				url: browser_download_url,
				signature: await getSignature(name, release.assets)
			};
	}

	return json(data, undefined, 3600);
});

const platforms = {
	'\.msi\.zip$': 'windows-x86_64',
	'\.deb\.tar\.gz$': 'linux-x86_64',
	'\.AppImage\.tar\.gz$': 'linux-x86_64'
};
const repositories = {
	mdpkm: 'Blookerss/mdpkm'
};

function getSignature(name: string, assets: any[]) {
    const signature = assets.find(asset => asset.name === `${name}.sig`);
    if (!signature)
        return null;

    return fetch(signature.browser_download_url).then(r => r.text());
}