import { GET } from '../../../../../src/helpers';
import { json, error } from '../../../../../src/helpers/response';
import { getLatestRelease } from '../../../../../src/util/github';
import { repositories, getPlatforms } from '../../../../../src/util/updater';

export const config = { runtime: 'edge' };
export default GET(async request => {
	const { name } = request.query;
	const repository = repositories[name];
	if (!repository)
		return error(400, 'INVALID_REPOSITORY');

	const release = await getLatestRelease(repository);
	return json({
		url: release.html_url,
		title: release.tag_name,
		body: release.body,
		version: release.tag_name.replace(/^v/g, ''),
		platforms: await getPlatforms(release),
		date_published: release.published_at
	}, undefined, 3600);
});