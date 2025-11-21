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
/**
 * Load and validate Hyperliquid configuration from environment variables
 * @throws {Error} If required environment variables are missing or invalid
 */
export function loadHyperliquidConfig() {
    const testnet = process.env.HYPERLIQUID_TESTNET === 'true';
    const apiPrivateKey = process.env.HYPERLIQUID_API_PRIVATE_KEY || process.env.HYPERLIQUID_LIVE_API_PRIVATE_KEY;
    const wallet = process.env.HYPERLIQUID_LIVE_API_WALLE;
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
    }
    catch (error) {
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
    },
    // Order sides
    ORDER_SIDE: {
        BUY: 'buy',
        SELL: 'sell',
    },
    // Order types
    ORDER_TYPE: {
        LIMIT: 'limit',
        MARKET: 'market',
    },
    // Time in force
    TIME_IN_FORCE: {
        GTC: 'Gtc', // Good til cancelled
        IOC: 'Ioc', // Immediate or cancel
        ALO: 'Alo', // Add liquidity only (post-only)
    },
    // Position sides
    POSITION_SIDE: {
        LONG: 'long',
        SHORT: 'short',
    },
    // Margin modes
    MARGIN_MODE: {
        CROSS: 'cross',
        ISOLATED: 'isolated',
    },
    // Supported candle intervals
    CANDLE_INTERVALS: [
        '1m', '3m', '5m', '15m', '30m',
        '1h', '2h', '4h', '8h', '12h',
        '1d'
    ],
    // Default cache TTL for user state (in seconds)
    USER_STATE_CACHE_TTL: 5, // 5 seconds
    // Reconciliation check types
    RECONCILIATION_TYPE: {
        ORDER_STATUS: 'order_status',
        FILL: 'fill',
        POSITION: 'position',
        BALANCE: 'balance',
    },
    // Max retries for API calls
    MAX_RETRIES: 3,
    // Retry delay (exponential backoff base in milliseconds)
    RETRY_DELAY_BASE: 1000,
    // Circuit breaker thresholds
    CIRCUIT_BREAKER: {
        FAILURE_THRESHOLD: 5, // Number of failures before opening circuit
        TIMEOUT: 60000, // Time to wait before attempting half-open (1 minute)
    },
};
