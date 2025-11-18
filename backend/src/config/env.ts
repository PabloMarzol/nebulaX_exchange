import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config({ path: '../.env' });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3000'),
  API_URL: z.string().default('http://localhost:3000'),
  FRONTEND_URL: z.string().default('http://localhost:5173'),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url().optional(),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRATION: z.string().default('7d'),
  SESSION_SECRET: z.string().min(32),
  ZERO_X_API_KEY: z.string().optional(),
  ONRAMP_API_KEY: z.string().optional(),
  ONRAMP_APP_ID: z.string().optional(),
  GROK_API_KEY: z.string().optional(),
  COINGECKO_API_KEY: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  SENDGRID_API_KEY: z.string().optional(),
});

export const env = envSchema.parse(process.env);
