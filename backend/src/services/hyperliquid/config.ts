import { z } from 'zod';

/**
 * Hyperliquid Configuration Schema
 * Validates environment variables required for Hyperliquid integration
 */
export const hyperliquidConfigSchema = z.object({
  testnet: z.boolean().default(true),
  wallet: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address').optional(),
  apiPrivateKey: z.string().regex(/^0x[a-fA-F0-9]{64}$/, 'Invalid private key'),
  mainnetUrl: z.string().url().default('https://api.hyperliquid.xyz'),
  testnetUrl: z.string().url().default('https://api.hyperliquid-testnet.xyz'),
  wsMainnetUrl: z.string().url().default('wss://api.hyperliquid.xyz/ws'),
  wsTestnetUrl: z.string().url().default('wss://api.hyperliquid-testnet.xyz/ws'),
});

export type HyperliquidConfig = z.infer<typeof hyperliquidConfigSchema>;

/**
 * Load and validate Hyperliquid configuration from environment variables
 * @throws {Error} If required environment variables are missing or invalid
 */
export function loadHyperliquidConfig(): HyperliquidConfig {
  const testnet = process.env.HYPERLIQUID_TESTNET === 'false';
  const apiPrivateKey = process.env.HYPERLIQUID_LIVE_API_PRIVATE_KEY;
  const wallet = process.env.HYPERLIQUID_LIVE_API_WALLET;

  const config = {
    testnet,
    wallet,
    apiPrivateKey,
    mainnetUrl: process.env.HYPERLIQUID_MAINNET_URL || 'https://api.hyperliquid.xyz',
    testnetUrl: process.env.HYPERLIQUID_TESTNET_URL || 'https://api.hyperliquid-testnet.xyz',
    wsMainnetUrl: process.env.HYPERLIQUID_WS_MAINNET_URL || 'wss://api.hyperliquid.xyz/ws',
    wsTestnetUrl: process.env.HYPERLIQUID_WS_TESTNET_URL || 'wss://api.hyperliquid-testnet.xyz/ws',
  };

  try {
    return hyperliquidConfigSchema.parse(config);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join('\n');
      throw new Error(`Invalid Hyperliquid configuration:\n${errorMessages}`);
    }
    throw error;
  }
}

/**
 * Constants for Hyperliquid integration
 */
export const HYPERLIQUID_CONSTANTS = {
  // Order status
  ORDER_STATUS: {
    PENDING: 'pending',
    OPEN: 'open',
    PARTIALLY_FILLED: 'partially_filled',
    FILLED: 'filled',
    CANCELLED: 'cancelled',
    FAILED: 'failed',
  } as const,

  // Order sides
  ORDER_SIDE: {
    BUY: 'buy',
    SELL: 'sell',
  } as const,

  // Order types
  ORDER_TYPE: {
    LIMIT: 'limit',
    MARKET: 'market',
  } as const,

  // Time in force
  TIME_IN_FORCE: {
    GTC: 'Gtc', // Good til cancelled
    IOC: 'Ioc', // Immediate or cancel
    ALO: 'Alo', // Add liquidity only (post-only)
  } as const,

  // Position sides
  POSITION_SIDE: {
    LONG: 'long',
    SHORT: 'short',
  } as const,

  // Margin modes
  MARGIN_MODE: {
    CROSS: 'cross',
    ISOLATED: 'isolated',
  } as const,

  // Supported candle intervals
  CANDLE_INTERVALS: [
    '1m', '3m', '5m', '15m', '30m',
    '1h', '2h', '4h', '8h', '12h',
    '1d'
  ] as const,

  // Default cache TTL for user state (in seconds)
  USER_STATE_CACHE_TTL: 5, // 5 seconds

  // Reconciliation check types
  RECONCILIATION_TYPE: {
    ORDER_STATUS: 'order_status',
    FILL: 'fill',
    POSITION: 'position',
    BALANCE: 'balance',
  } as const,

  // Max retries for API calls
  MAX_RETRIES: 3,

  // Retry delay (exponential backoff base in milliseconds)
  RETRY_DELAY_BASE: 1000,

  // Circuit breaker thresholds
  CIRCUIT_BREAKER: {
    FAILURE_THRESHOLD: 5, // Number of failures before opening circuit
    TIMEOUT: 60000, // Time to wait before attempting half-open (1 minute)
  },
} as const;

// Export type for order status
export type OrderStatus = typeof HYPERLIQUID_CONSTANTS.ORDER_STATUS[keyof typeof HYPERLIQUID_CONSTANTS.ORDER_STATUS];

// Export type for order side
export type OrderSide = typeof HYPERLIQUID_CONSTANTS.ORDER_SIDE[keyof typeof HYPERLIQUID_CONSTANTS.ORDER_SIDE];

// Export type for order type
export type OrderType = typeof HYPERLIQUID_CONSTANTS.ORDER_TYPE[keyof typeof HYPERLIQUID_CONSTANTS.ORDER_TYPE];

// Export type for time in force
export type TimeInForce = typeof HYPERLIQUID_CONSTANTS.TIME_IN_FORCE[keyof typeof HYPERLIQUID_CONSTANTS.TIME_IN_FORCE];

// Export type for position side
export type PositionSide = typeof HYPERLIQUID_CONSTANTS.POSITION_SIDE[keyof typeof HYPERLIQUID_CONSTANTS.POSITION_SIDE];

// Export type for candle interval
export type CandleInterval = typeof HYPERLIQUID_CONSTANTS.CANDLE_INTERVALS[number];
