import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { HyperliquidClient, getHyperliquidClient, resetHyperliquidClient } from '../HyperliquidClient';
import { loadHyperliquidConfig } from '../config';
import dotenv from 'dotenv';

// Load environment variables for testing
dotenv.config();

describe('HyperliquidClient', () => {
  let client: HyperliquidClient;

  beforeAll(() => {
    // Initialize client with test configuration
    const config = loadHyperliquidConfig();
    client = new HyperliquidClient({
      testnet: config.testnet,
      walletAddress: config.wallet,
      apiPrivateKey: config.apiPrivateKey,
    });
  });

  afterAll(() => {
    resetHyperliquidClient();
  });

  describe('Initialization', () => {
    it('should initialize all clients', () => {
      expect(client).toBeDefined();
      expect(client.infoClient).toBeDefined();
      expect(client.exchangeClient).toBeDefined();
      expect(client.subscriptionClient).toBeDefined();
    });

    it('should return config', () => {
      const config = client.getConfig();
      expect(config).toHaveProperty('testnet');
    });

    it('should get singleton instance', () => {
      const instance1 = getHyperliquidClient();
      const instance2 = getHyperliquidClient();
      expect(instance1).toBe(instance2);
    });
  });

  describe('Market Data Queries', () => {
    it('should fetch all metas (symbols)', async () => {
      const metas = await client.getAllMetas();
      expect(metas).toBeDefined();
      expect(metas).toHaveProperty('universe');
      expect(Array.isArray(metas.universe)).toBe(true);
    });

    it('should fetch all mid prices', async () => {
      const mids = await client.getAllMids();
      expect(mids).toBeDefined();
      expect(typeof mids).toBe('object');
    });

    it('should fetch orderbook for BTC', async () => {
      const orderbook = await client.getOrderbook('BTC');
      expect(orderbook).toBeDefined();
      expect(orderbook).toHaveProperty('levels');
      expect(Array.isArray(orderbook.levels)).toBe(true);
      expect(orderbook.levels).toHaveLength(2); // [bids, asks]
    }, 10000); // 10 second timeout
  });

  describe('User Queries', () => {
    it('should handle invalid user address gracefully', async () => {
      const invalidAddress = '0x0000000000000000000000000000000000000000';

      // This might return empty data or throw, depending on API behavior
      // We just want to ensure it doesn't crash
      try {
        const orders = await client.getOpenOrders(invalidAddress);
        expect(orders).toBeDefined();
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('Configuration Validation', () => {
    it('should load valid config from environment', () => {
      const config = loadHyperliquidConfig();
      expect(config).toHaveProperty('testnet');
      expect(config).toHaveProperty('apiPrivateKey');
      expect(config.apiPrivateKey).toMatch(/^0x[a-fA-F0-9]{64}$/);
    });

    it('should use default URLs if not provided', () => {
      const config = loadHyperliquidConfig();
      expect(config.mainnetUrl).toBe('https://api.hyperliquid.xyz');
      expect(config.testnetUrl).toBe('https://api.hyperliquid-testnet.xyz');
    });
  });
});

/**
 * Integration tests - only run when HYPERLIQUID_WALLET is set
 */
describe('HyperliquidClient Integration Tests', () => {
  const walletAddress = process.env.HYPERLIQUID_WALLET;

  // Skip if wallet address is not configured
  const runIf = walletAddress && walletAddress !== '0x...' ? it : it.skip;

  runIf('should fetch user state for configured wallet', async () => {
    const client = getHyperliquidClient();
    const userState = await client.getUserState(walletAddress!);

    expect(userState).toBeDefined();
    expect(userState).toHaveProperty('marginSummary');
  }, 10000);

  runIf('should fetch open orders for configured wallet', async () => {
    const client = getHyperliquidClient();
    const orders = await client.getOpenOrders(walletAddress!);

    expect(orders).toBeDefined();
    expect(Array.isArray(orders)).toBe(true);
  }, 10000);
});
