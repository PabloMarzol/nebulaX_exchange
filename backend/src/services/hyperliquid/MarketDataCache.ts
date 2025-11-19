import { OrderbookUpdate, TradeUpdate, CandleUpdate } from './MarketDataService';

/**
 * Cache entry with TTL
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

/**
 * Orderbook cache data
 */
export interface CachedOrderbook {
  coin: string;
  bids: Array<{ price: string; size: string }>;
  asks: Array<{ price: string; size: string }>;
  timestamp: number;
}

/**
 * Trade cache data
 */
export interface CachedTrade {
  coin: string;
  side: string;
  price: string;
  size: string;
  timestamp: number;
}

/**
 * MarketDataCache
 *
 * In-memory cache for market data to reduce API calls and improve performance.
 *
 * Features:
 * - TTL-based expiration
 * - Automatic cleanup of expired entries
 * - Size limits to prevent memory leaks
 * - Fast lookups with Map data structure
 */
export class MarketDataCache {
  private orderbookCache = new Map<string, CacheEntry<CachedOrderbook>>();
  private tradesCache = new Map<string, CacheEntry<CachedTrade[]>>();
  private midsCache: CacheEntry<Record<string, string>> | null = null;
  private candlesCache = new Map<string, CacheEntry<CandleUpdate[]>>();

  // Cache configuration
  private defaultTTL = 5000; // 5 seconds default TTL
  private orderbookTTL = 2000; // 2 seconds for orderbook (fast updates)
  private tradesTTL = 10000; // 10 seconds for trades
  private midsTTL = 3000; // 3 seconds for mids
  private candlesTTL = 60000; // 1 minute for candles

  // Size limits
  private maxTradesPerSymbol = 100; // Keep last 100 trades per symbol
  private maxCandlesPerKey = 1000; // Keep last 1000 candles per symbol/interval

  constructor() {
    // Start cleanup interval (every 30 seconds)
    setInterval(() => this.cleanup(), 30000);
  }

  /**
   * Cache orderbook data
   */
  setOrderbook(symbol: string, data: OrderbookUpdate): void {
    const cached: CachedOrderbook = {
      coin: symbol,
      bids: data.levels[0].map(([price, size]) => ({ price, size })),
      asks: data.levels[1].map(([price, size]) => ({ price, size })),
      timestamp: data.time,
    };

    this.orderbookCache.set(symbol, {
      data: cached,
      timestamp: Date.now(),
      expiresAt: Date.now() + this.orderbookTTL,
    });
  }

  /**
   * Get cached orderbook
   */
  getOrderbook(symbol: string): CachedOrderbook | null {
    const entry = this.orderbookCache.get(symbol);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.orderbookCache.delete(symbol);
      return null;
    }

    return entry.data;
  }

  /**
   * Cache trades data
   */
  setTrades(symbol: string, trades: TradeUpdate[]): void {
    const existing = this.tradesCache.get(symbol);
    let cachedTrades: CachedTrade[] = [];

    if (existing && Date.now() <= existing.expiresAt) {
      cachedTrades = existing.data;
    }

    // Add new trades
    const newTrades = trades.map((trade) => ({
      coin: symbol,
      side: trade.side,
      price: trade.px,
      size: trade.sz,
      timestamp: trade.time,
    }));

    cachedTrades = [...newTrades, ...cachedTrades];

    // Limit size
    if (cachedTrades.length > this.maxTradesPerSymbol) {
      cachedTrades = cachedTrades.slice(0, this.maxTradesPerSymbol);
    }

    this.tradesCache.set(symbol, {
      data: cachedTrades,
      timestamp: Date.now(),
      expiresAt: Date.now() + this.tradesTTL,
    });
  }

  /**
   * Get cached trades
   */
  getTrades(symbol: string, limit?: number): CachedTrade[] | null {
    const entry = this.tradesCache.get(symbol);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.tradesCache.delete(symbol);
      return null;
    }

    return limit ? entry.data.slice(0, limit) : entry.data;
  }

  /**
   * Cache all mids
   */
  setAllMids(mids: Record<string, string>): void {
    this.midsCache = {
      data: mids,
      timestamp: Date.now(),
      expiresAt: Date.now() + this.midsTTL,
    };
  }

  /**
   * Get cached mids
   */
  getAllMids(): Record<string, string> | null {
    if (!this.midsCache) return null;

    if (Date.now() > this.midsCache.expiresAt) {
      this.midsCache = null;
      return null;
    }

    return this.midsCache.data;
  }

  /**
   * Get mid price for a specific symbol
   */
  getMid(symbol: string): string | null {
    const mids = this.getAllMids();
    return mids ? mids[symbol] || null : null;
  }

  /**
   * Cache candle data
   */
  setCandles(symbol: string, interval: string, candles: CandleUpdate[]): void {
    const key = `${symbol}:${interval}`;
    const existing = this.candlesCache.get(key);
    let cachedCandles: CandleUpdate[] = [];

    if (existing && Date.now() <= existing.expiresAt) {
      cachedCandles = existing.data;
    }

    // Add new candles (avoiding duplicates by timestamp)
    const timestamps = new Set(cachedCandles.map((c) => c.time));
    const newCandles = candles.filter((c) => !timestamps.has(c.time));

    cachedCandles = [...newCandles, ...cachedCandles];

    // Sort by timestamp descending
    cachedCandles.sort((a, b) => b.time - a.time);

    // Limit size
    if (cachedCandles.length > this.maxCandlesPerKey) {
      cachedCandles = cachedCandles.slice(0, this.maxCandlesPerKey);
    }

    this.candlesCache.set(key, {
      data: cachedCandles,
      timestamp: Date.now(),
      expiresAt: Date.now() + this.candlesTTL,
    });
  }

  /**
   * Get cached candles
   */
  getCandles(symbol: string, interval: string, limit?: number): CandleUpdate[] | null {
    const key = `${symbol}:${interval}`;
    const entry = this.candlesCache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.candlesCache.delete(key);
      return null;
    }

    return limit ? entry.data.slice(0, limit) : entry.data;
  }

  /**
   * Clean up expired entries
   */
  cleanup(): void {
    const now = Date.now();
    let cleanedCount = 0;

    // Clean orderbooks
    for (const [key, entry] of this.orderbookCache.entries()) {
      if (now > entry.expiresAt) {
        this.orderbookCache.delete(key);
        cleanedCount++;
      }
    }

    // Clean trades
    for (const [key, entry] of this.tradesCache.entries()) {
      if (now > entry.expiresAt) {
        this.tradesCache.delete(key);
        cleanedCount++;
      }
    }

    // Clean mids
    if (this.midsCache && now > this.midsCache.expiresAt) {
      this.midsCache = null;
      cleanedCount++;
    }

    // Clean candles
    for (const [key, entry] of this.candlesCache.entries()) {
      if (now > entry.expiresAt) {
        this.candlesCache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`[MarketDataCache] Cleaned up ${cleanedCount} expired entries`);
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      orderbooks: this.orderbookCache.size,
      trades: this.tradesCache.size,
      mids: this.midsCache ? 1 : 0,
      candles: this.candlesCache.size,
      totalEntries: this.orderbookCache.size + this.tradesCache.size +
                    (this.midsCache ? 1 : 0) + this.candlesCache.size,
    };
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.orderbookCache.clear();
    this.tradesCache.clear();
    this.midsCache = null;
    this.candlesCache.clear();
    console.log('[MarketDataCache] All cache cleared');
  }

  /**
   * Clear cache for a specific symbol
   */
  clearSymbol(symbol: string): void {
    this.orderbookCache.delete(symbol);
    this.tradesCache.delete(symbol);

    // Clear candles for this symbol
    for (const key of this.candlesCache.keys()) {
      if (key.startsWith(`${symbol}:`)) {
        this.candlesCache.delete(key);
      }
    }

    console.log(`[MarketDataCache] Cleared cache for ${symbol}`);
  }
}

/**
 * Singleton instance
 */
let marketDataCacheInstance: MarketDataCache | null = null;

/**
 * Get the singleton instance of MarketDataCache
 */
export function getMarketDataCache(): MarketDataCache {
  if (!marketDataCacheInstance) {
    marketDataCacheInstance = new MarketDataCache();
    console.log('[MarketDataCache] Instance created');
  }

  return marketDataCacheInstance;
}

/**
 * Reset the singleton instance (useful for testing)
 */
export function resetMarketDataCache(): void {
  if (marketDataCacheInstance) {
    marketDataCacheInstance.clear();
    marketDataCacheInstance = null;
  }
}
