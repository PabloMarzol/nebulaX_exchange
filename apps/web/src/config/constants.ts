export const APP_NAME = 'NebulAX Exchange';
export const APP_DESCRIPTION = 'Decentralized Cryptocurrency Trading Platform';

// Supported chains
export const SUPPORTED_CHAINS = {
  ETHEREUM: 1,
  POLYGON: 137,
  ARBITRUM: 42161,
  BSC: 56,
  BASE: 8453,
  OPTIMISM: 10,
} as const;

// Trading pairs
export const TRADING_PAIRS = [
  'BTC/USDT',
  'ETH/USDT',
  'SOL/USDT',
  'BNB/USDT',
  'XRP/USDT',
  'ADA/USDT',
  'DOGE/USDT',
  'MATIC/USDT',
] as const;

// Chart intervals
export const CHART_INTERVALS = ['1m', '5m', '15m', '1h', '4h', '1d'] as const;

// Order types
export const ORDER_TYPES = ['market', 'limit', 'stop'] as const;

// Order sides
export const ORDER_SIDES = ['buy', 'sell'] as const;

// Supported fiat currencies
export const FIAT_CURRENCIES = ['USD', 'EUR', 'GBP', 'INR'] as const;

// Supported crypto currencies for on-ramp
export const ONRAMP_CRYPTOS = ['USDT', 'USDC', 'ETH', 'BTC'] as const;

// API endpoints
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/api/auth/login',
    LOGOUT: '/api/auth/logout',
    VERIFY: '/api/auth/verify',
    NONCE: '/api/auth/nonce',
  },
  TRADING: {
    ORDERS: '/api/trading/orders',
    OPEN_ORDERS: '/api/trading/orders/open',
    CANCEL_ORDER: '/api/trading/orders/:id',
    TRADES: '/api/trading/trades',
    POSITIONS: '/api/trading/positions',
  },
  SWAP: {
    QUOTE: '/api/swap/quote',
    EXECUTE: '/api/swap/execute',
    TOKENS: '/api/swap/tokens',
  },
  ONRAMP: {
    QUOTE: '/api/onramp/quote',
    ORDERS: '/api/onramp/orders',
  },
  MARKET: {
    PRICES: '/api/market/prices',
    CANDLES: '/api/market/candles',
    ORDER_BOOK: '/api/market/orderbook',
  },
  PORTFOLIO: {
    BALANCE: '/api/portfolio/balance',
    HISTORY: '/api/portfolio/history',
  },
  AI: {
    CHAT: '/api/ai/chat',
    SIGNAL: '/api/ai/generate-signal',
    ANALYZE: '/api/ai/analyze-market',
  },
} as const;
