import { beforeAll, afterAll, afterEach, vi } from 'vitest';
import dotenv from 'dotenv';
import path from 'path';

// Load test environment variables
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

// Mock environment variables for tests
process.env.NODE_ENV = 'test';
process.env.HYPERLIQUID_TESTNET = 'true';

// Provide dummy Hyperliquid credentials for testing if not set
if (!process.env.HYPERLIQUID_API_PRIVATE_KEY || process.env.HYPERLIQUID_API_PRIVATE_KEY === '') {
  // Valid 64-character hex private key format for testing (dummy key)
  process.env.HYPERLIQUID_API_PRIVATE_KEY = '0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
}

if (!process.env.HYPERLIQUID_API_WALLET_ADDRESS || process.env.HYPERLIQUID_API_WALLET_ADDRESS === '') {
  // Valid Ethereum address format for testing
  process.env.HYPERLIQUID_API_WALLET_ADDRESS = '0x0000000000000000000000000000000000000001';
}

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
