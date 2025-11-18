import type { Config } from 'drizzle-kit';
import dotenv from 'dotenv';

dotenv.config({ path: '../.env' });

export default {
  schema: '../shared/schema/*.schema.ts',
  out: './migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config;
