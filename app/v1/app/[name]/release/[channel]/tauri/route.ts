import handler from '../../../../../../../lib/handler';
import { json, status } from '../../../../../../../lib/response';
import { getLatestRelease } from '../../../../../../../lib/util/github';
import { repositories, getPlatforms } from '../../../../../../../lib/util/updater';

export const runtime = 'edge';
export const GET = handler(async request => {
	const { name, channel, version } = request.query;
	const repository = repositories[name];
	if (!repository)
		return status(404);

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
export const OPTIONS = () => status(200);