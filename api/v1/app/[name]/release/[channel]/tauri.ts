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
		notes: release.body,
		version: release.tag_name,
		pub_date: release.published_at,
		platforms: await getPlatforms(release)
	}, undefined, 3600);
});