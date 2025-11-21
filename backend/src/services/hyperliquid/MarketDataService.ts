import { HyperliquidClient } from './HyperliquidClient';
import { WsUserEvent } from '@nktkas/hyperliquid';
import { Server as SocketIOServer } from 'socket.io';
import { CANDLE_INTERVALS } from './config';

interface Subscription {
  type: 'orderbook' | 'trades' | 'candles' | 'allMids';
  symbol?: string;
  interval?: string;
}

interface MarketDataCache {
  orderbooks: Map<string, any>;
  trades: Map<string, any[]>;
  candles: Map<string, Map<string, any[]>>;
  allMids: Map<string, string>;
}

/**
 * MarketDataService manages Hyperliquid WebSocket subscriptions and relays
 * real-time market data to connected Socket.io clients.
 */
export class MarketDataService {
  private static instance: MarketDataService | null = null;
  private hlClient: HyperliquidClient;
  private io: SocketIOServer | null = null;
  private subscriptions: Set<string> = new Set();
  private cache: MarketDataCache = {
    orderbooks: new Map(),
    trades: new Map(),
    candles: new Map(),
    allMids: new Map(),
  };

  private constructor() {
    this.hlClient = HyperliquidClient.getInstance();
  }

  /**
   * Get singleton instance of MarketDataService
   */
  public static getInstance(): MarketDataService {
    if (!MarketDataService.instance) {
      MarketDataService.instance = new MarketDataService();
    }
    return MarketDataService.instance;
  }

  /**
   * Initialize the service with Socket.io server
   */
  public initialize(io: SocketIOServer): void {
    this.io = io;
    console.log('[MarketDataService] Initialized with Socket.io server');

    // Subscribe to all mids by default for price ticker
    this.subscribeToAllMids();
  }

  /**
   * Subscribe to orderbook updates for a specific symbol
   */
  public async subscribeToOrderbook(symbol: string): Promise<void> {
    const subKey = `orderbook:${symbol}`;
    if (this.subscriptions.has(subKey)) {
      console.log(`[MarketDataService] Already subscribed to orderbook for ${symbol}`);
      return;
    }

    try {
      // Subscribe to Hyperliquid WebSocket
      await this.hlClient.subscribeToOrderbook(symbol, (data) => {
        // Cache the orderbook data
        this.cache.orderbooks.set(symbol, data);

        // Relay to Socket.io clients
        this.io?.to(`market:${symbol}`).emit('orderbook:update', {
          symbol,
          data,
          timestamp: Date.now(),
        });
      });

      this.subscriptions.add(subKey);
      console.log(`[MarketDataService] Subscribed to orderbook for ${symbol}`);

      // Fetch initial orderbook snapshot
      const snapshot = await this.hlClient.getOrderbook(symbol);
      this.cache.orderbooks.set(symbol, snapshot);
    } catch (error) {
      console.error(`[MarketDataService] Failed to subscribe to orderbook for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Subscribe to trade updates for a specific symbol
   */
  public async subscribeToTrades(symbol: string): Promise<void> {
    const subKey = `trades:${symbol}`;
    if (this.subscriptions.has(subKey)) {
      console.log(`[MarketDataService] Already subscribed to trades for ${symbol}`);
      return;
    }

    try {
      // Subscribe to Hyperliquid WebSocket
      await this.hlClient.subscribeToTrades(symbol, (data) => {
        // Cache the latest trades (keep last 100)
        const trades = this.cache.trades.get(symbol) || [];
        trades.unshift(data);
        if (trades.length > 100) trades.pop();
        this.cache.trades.set(symbol, trades);

        // Relay to Socket.io clients
        this.io?.to(`market:${symbol}`).emit('trades:update', {
          symbol,
          data,
          timestamp: Date.now(),
        });
      });

      this.subscriptions.add(subKey);
      console.log(`[MarketDataService] Subscribed to trades for ${symbol}`);
    } catch (error) {
      console.error(`[MarketDataService] Failed to subscribe to trades for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Subscribe to candle updates for a specific symbol and interval
   */
  public async subscribeToCandles(symbol: string, interval: string): Promise<void> {
    const subKey = `candles:${symbol}:${interval}`;
    if (this.subscriptions.has(subKey)) {
      console.log(`[MarketDataService] Already subscribed to candles for ${symbol} ${interval}`);
      return;
    }

    try {
      // Subscribe to Hyperliquid WebSocket
      await this.hlClient.subscribeToCandles(symbol, interval, (data) => {
        // Cache the candles
        if (!this.cache.candles.has(symbol)) {
          this.cache.candles.set(symbol, new Map());
        }
        const symbolCandles = this.cache.candles.get(symbol)!;
        const candles = symbolCandles.get(interval) || [];

        // Update or append the candle
        const existingIndex = candles.findIndex((c: any) => c.t === data.t);
        if (existingIndex >= 0) {
          candles[existingIndex] = data;
        } else {
          candles.push(data);
          // Keep last 1000 candles
          if (candles.length > 1000) candles.shift();
        }
        symbolCandles.set(interval, candles);

        // Relay to Socket.io clients
        this.io?.to(`market:${symbol}:${interval}`).emit('candles:update', {
          symbol,
          interval,
          data,
          timestamp: Date.now(),
        });
      });

      this.subscriptions.add(subKey);
      console.log(`[MarketDataService] Subscribed to candles for ${symbol} ${interval}`);

      // Fetch initial candle snapshot only if not already cached
      const symbolCandles = this.cache.candles.get(symbol);
      const hasCachedCandles = symbolCandles && symbolCandles.has(interval);

      if (!hasCachedCandles) {
        console.log(`[MarketDataService] Fetching initial candle snapshot for ${symbol} ${interval}`);
        try {
          const snapshot = await this.hlClient.getCandles(symbol, interval, {
            startTime: Date.now() - 24 * 60 * 60 * 1000, // Last 24 hours
            endTime: Date.now(),
          });

          if (!this.cache.candles.has(symbol)) {
            this.cache.candles.set(symbol, new Map());
          }
          this.cache.candles.get(symbol)!.set(interval, snapshot);
        } catch (error: any) {
          // If we hit rate limits, just skip the initial snapshot - WebSocket will populate it
          if (error?.response?.status === 429) {
            console.warn(`[MarketDataService] Rate limit hit for initial candles, will populate from WebSocket`);
          } else {
            throw error;
          }
        }
      } else {
        console.log(`[MarketDataService] Using cached candles for ${symbol} ${interval}`);
      }
    } catch (error) {
      console.error(`[MarketDataService] Failed to subscribe to candles for ${symbol} ${interval}:`, error);
      throw error;
    }
  }

  /**
   * Subscribe to all mid prices (for price ticker)
   */
  public async subscribeToAllMids(): Promise<void> {
    const subKey = 'allMids';
    if (this.subscriptions.has(subKey)) {
      console.log('[MarketDataService] Already subscribed to allMids');
      return;
    }

    try {
      // Subscribe to Hyperliquid WebSocket
      await this.hlClient.subscribeToAllMids((data) => {
        // Cache all mid prices
        Object.entries(data.mids).forEach(([symbol, price]) => {
          this.cache.allMids.set(symbol, price);
        });

        // Relay to Socket.io clients
        this.io?.to('prices').emit('prices:update', {
          data: data.mids,
          timestamp: Date.now(),
        });
      });

      this.subscriptions.add(subKey);
      console.log('[MarketDataService] Subscribed to allMids');
    } catch (error) {
      console.error('[MarketDataService] Failed to subscribe to allMids:', error);
      throw error;
    }
  }

  /**
   * Subscribe to user events (fills, order updates, etc.)
   */
  public async subscribeToUserEvents(userId: string, callback: (data: WsUserEvent) => void): Promise<void> {
    const subKey = `user:${userId}`;
    if (this.subscriptions.has(subKey)) {
      console.log(`[MarketDataService] Already subscribed to user events for ${userId}`);
      return;
    }

    try {
      // Subscribe to Hyperliquid WebSocket
      await this.hlClient.subscribeToUserEvents(userId, (data) => {
        callback(data);

        // Relay to Socket.io clients in user's room
        this.io?.to(`user:${userId}`).emit('user:event', {
          data,
          timestamp: Date.now(),
        });
      });

      this.subscriptions.add(subKey);
      console.log(`[MarketDataService] Subscribed to user events for ${userId}`);
    } catch (error) {
      console.error(`[MarketDataService] Failed to subscribe to user events for ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Unsubscribe from orderbook updates
   */
  public unsubscribeFromOrderbook(symbol: string): void {
    const subKey = `orderbook:${symbol}`;
    if (!this.subscriptions.has(subKey)) return;

    this.hlClient.unsubscribeFromOrderbook(symbol);
    this.subscriptions.delete(subKey);
    this.cache.orderbooks.delete(symbol);
    console.log(`[MarketDataService] Unsubscribed from orderbook for ${symbol}`);
  }

  /**
   * Unsubscribe from trade updates
   */
  public unsubscribeFromTrades(symbol: string): void {
    const subKey = `trades:${symbol}`;
    if (!this.subscriptions.has(subKey)) return;

    this.hlClient.unsubscribeFromTrades(symbol);
    this.subscriptions.delete(subKey);
    this.cache.trades.delete(symbol);
    console.log(`[MarketDataService] Unsubscribed from trades for ${symbol}`);
  }

  /**
   * Unsubscribe from candle updates
   */
  public unsubscribeFromCandles(symbol: string, interval: string): void {
    const subKey = `candles:${symbol}:${interval}`;
    if (!this.subscriptions.has(subKey)) return;

    this.hlClient.unsubscribeFromCandles(symbol, interval);
    this.subscriptions.delete(subKey);

    const symbolCandles = this.cache.candles.get(symbol);
    if (symbolCandles) {
      symbolCandles.delete(interval);
      if (symbolCandles.size === 0) {
        this.cache.candles.delete(symbol);
      }
    }
    console.log(`[MarketDataService] Unsubscribed from candles for ${symbol} ${interval}`);
  }

  /**
   * Unsubscribe from user events
   */
  public unsubscribeFromUserEvents(userId: string): void {
    const subKey = `user:${userId}`;
    if (!this.subscriptions.has(subKey)) return;

    this.hlClient.unsubscribeFromUserEvents(userId);
    this.subscriptions.delete(subKey);
    console.log(`[MarketDataService] Unsubscribed from user events for ${userId}`);
  }

  /**
   * Get cached orderbook data
   */
  public getCachedOrderbook(symbol: string): any {
    return this.cache.orderbooks.get(symbol);
  }

  /**
   * Get cached trades data
   */
  public getCachedTrades(symbol: string): any[] {
    return this.cache.trades.get(symbol) || [];
  }

  /**
   * Get cached candles data
   */
  public getCachedCandles(symbol: string, interval: string): any[] {
    return this.cache.candles.get(symbol)?.get(interval) || [];
  }

  /**
   * Get cached mid price
   */
  public getCachedMidPrice(symbol: string): string | undefined {
    return this.cache.allMids.get(symbol);
  }

  /**
   * Get all cached mid prices
   */
  public getAllCachedMidPrices(): Map<string, string> {
    return this.cache.allMids;
  }

  /**
   * Get active subscriptions count
   */
  public getActiveSubscriptionsCount(): number {
    return this.subscriptions.size;
  }

  /**
   * Check if subscribed to a specific feed
   */
  public isSubscribed(type: string, symbol?: string, interval?: string): boolean {
    let subKey = type;
    if (symbol) subKey += `:${symbol}`;
    if (interval) subKey += `:${interval}`;
    return this.subscriptions.has(subKey);
  }

  /**
   * Clean up all subscriptions
   */
  public async cleanup(): Promise<void> {
    console.log('[MarketDataService] Cleaning up all subscriptions...');

    // Unsubscribe from all feeds
    for (const subKey of this.subscriptions) {
      const [type, symbol, interval] = subKey.split(':');

      if (type === 'orderbook' && symbol) {
        this.hlClient.unsubscribeFromOrderbook(symbol);
      } else if (type === 'trades' && symbol) {
        this.hlClient.unsubscribeFromTrades(symbol);
      } else if (type === 'candles' && symbol && interval) {
        this.hlClient.unsubscribeFromCandles(symbol, interval);
      } else if (type === 'user' && symbol) {
        this.hlClient.unsubscribeFromUserEvents(symbol);
      }
    }

    this.subscriptions.clear();
    this.cache.orderbooks.clear();
    this.cache.trades.clear();
    this.cache.candles.clear();
    this.cache.allMids.clear();

    console.log('[MarketDataService] Cleanup complete');
  }
}

export default MarketDataService;
