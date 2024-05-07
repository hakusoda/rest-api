import { z } from 'zod';
export const ROBLOX_ID = z.number().int().finite().positive();