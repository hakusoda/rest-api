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
		notes: release.body,
		version: release.tag_name,
		pub_date: release.published_at,
		platforms: await getPlatforms(release)
	}, undefined, 3600);
});