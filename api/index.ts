import { GET } from '../src/helpers';
import { json } from '../src/helpers/response';
export const config = { runtime: 'edge' };
export default GET(() => json({
	name: 'voxelified-api',
	version: '1.0.0'
}, undefined, 3600));