import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '../config/env.js';
import * as schema from '../../../shared/schema/index.js';

// Create postgres connection
const connectionString = env.DATABASE_URL;
const client = postgres(connectionString);

// Create drizzle instance
export const db = drizzle(client, { schema });

// Helper to close connection (for testing)
export async function closeConnection() {
  await client.end();
}
