import { beforeAll, afterAll, afterEach, vi } from 'vitest';
import dotenv from 'dotenv';
import path from 'path';
// Load test environment variables
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
// Mock environment variables for tests
process.env.NODE_ENV = 'test';
process.env.HYPERLIQUID_TESTNET = 'true';
// Global test setup
beforeAll(() => {
    console.log('[Test Setup] Initializing test environment...');
});
// Cleanup after all tests
afterAll(() => {
    console.log('[Test Setup] Cleaning up test environment...');
});
// Reset mocks after each test
afterEach(() => {
    vi.clearAllMocks();
});
