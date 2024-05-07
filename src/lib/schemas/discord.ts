import { z } from 'zod';
export const DISCORD_SNOWFLAKE = z.string().refine(value => BigInt(value).toString() === value);