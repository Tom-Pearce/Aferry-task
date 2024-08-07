import { z } from 'zod';

export const env = z
    .object({
        PUBLISH_URL: z.string(),
    })
    .parse(process.env);
