import { z } from 'zod';
export const ROBLOX_ID = z.string().refine(value => BigInt(value).toString() === value);