import { GET } from '../../../../../../src/helpers';
import { getLatestRelease } from '../../../../../../src/util/github';
import { json, error, status } from '../../../../../../src/helpers/response';
import { repositories, getPlatforms } from '../../../../../../src/util/updater';

export const config = { runtime: 'edge' };
export default GET(async request => {
	const { name, channel, version } = request.query;
	const repository = repositories[name];
	if (!repository)
		return error(400, 'INVALID_REPOSITORY');

	const release = await getLatestRelease(repository, channel);
	if (`v${version}` === release.tag_name)
		return status(204);
	return json({
		url: release.html_url,
		title: release.tag_name,
		body: release.body,
		version: release.tag_name.replace(/^v/g, ''),
		platforms: await getPlatforms(release),
		date_published: release.published_at
	}, undefined, 3600);
});