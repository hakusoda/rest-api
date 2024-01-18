import { json } from '@sveltejs/kit';

import { version } from '../../package.json';
import { VERCEL_GIT_REPO_SLUG, VERCEL_GIT_REPO_OWNER, VERCEL_GIT_COMMIT_SHA, VERCEL_GIT_COMMIT_REF, VERCEL_GIT_COMMIT_AUTHOR_LOGIN } from '$env/static/private';

const repository = `${VERCEL_GIT_REPO_OWNER}/${VERCEL_GIT_REPO_SLUG}`;
export const GET = () => json({
	name: 'hakumi-rest-api',
	version,
	git_commit: {
		sha: VERCEL_GIT_COMMIT_SHA,
		branch: VERCEL_GIT_COMMIT_REF,
		author: VERCEL_GIT_COMMIT_AUTHOR_LOGIN,
		repository,
		website_url: `https://github.com/${repository}/commit/${VERCEL_GIT_COMMIT_SHA}`
	},
	reference_url: 'https://hakumi.cafe/reference/rest-api',
	documentation_url: 'https://hakumi.cafe/docs/api'
});