import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '../config/env.js';
import * as schema from "@shared/schema/index.js";

// Create postgres connection (with error handling for optional DB)
let client: ReturnType<typeof postgres> | null = null;
let dbInstance: ReturnType<typeof drizzle> | null = null;

try {
  const connectionString = env.DATABASE_URL;

  // Only connect if DATABASE_URL is properly configured
  if (connectionString && !connectionString.includes('user:password')) {
    client = postgres(connectionString, {
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
    });
    dbInstance = drizzle(client, { schema });
    console.log('✓ Database connected successfully');
  } else {
    console.warn('⚠ Database not configured - trading features will work without persistence');
  }
} catch (error) {
  console.warn('⚠ Database connection failed - running without database:', error instanceof Error ? error.message : 'Unknown error');
}

// Export db (will be null if not configured)
export const db = dbInstance as ReturnType<typeof drizzle>;

// Helper to close connection (for testing)
export async function closeConnection() {
  if (client) {
    await client.end();
  }
}
