import { json } from '../lib/response';
export const runtime = 'edge';
export const GET = () => json({
	name: 'voxelified-rest-api',
	version: '1.1.0' // TODO acquire version from package.json
});