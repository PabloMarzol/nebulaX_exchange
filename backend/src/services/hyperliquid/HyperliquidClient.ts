import {
  InfoClient,
  ExchangeClient,
  SubscriptionClient,
  HttpTransport,
  WebSocketTransport,
} from '@nktkas/hyperliquid';

interface HyperliquidConfig {
  testnet: boolean;
  walletAddress?: string;
  apiPrivateKey: string;
}

/**
 * Hyperliquid API Client Wrapper
 *
 * This class provides a unified interface to interact with Hyperliquid's
 * perpetual futures DEX. It wraps three main clients:
 * - InfoClient: Query market data, positions, and orderbook (no auth required)
 * - ExchangeClient: Place/cancel orders (requires API wallet)
 * - SubscriptionClient: WebSocket subscriptions for real-time data
 */
export class HyperliquidClient {
  private config: HyperliquidConfig;
  public infoClient: InfoClient;
  public exchangeClient: ExchangeClient;
  public subscriptionClient: SubscriptionClient;

  constructor(config: HyperliquidConfig) {
    this.config = config;

    const httpUrl = config.testnet
      ? process.env.HYPERLIQUID_TESTNET_URL || 'https://api.hyperliquid-testnet.xyz'
      : process.env.HYPERLIQUID_MAINNET_URL || 'https://api.hyperliquid.xyz';

    const wsUrl = config.testnet
      ? process.env.HYPERLIQUID_WS_TESTNET_URL || 'wss://api.hyperliquid-testnet.xyz/ws'
      : process.env.HYPERLIQUID_WS_MAINNET_URL || 'wss://api.hyperliquid.xyz/ws';

    // Info client for querying data (no authentication required)
    this.infoClient = new InfoClient({
      transport: new HttpTransport({ url: httpUrl }),
    });

    // Exchange client for trading (requires API wallet private key)
    this.exchangeClient = new ExchangeClient({
      wallet: config.apiPrivateKey,
      testnet: config.testnet,
      transport: new HttpTransport({ url: httpUrl }),
    });

    // Subscription client for WebSocket feeds
    this.subscriptionClient = new SubscriptionClient({
      transport: new WebSocketTransport({ url: wsUrl }),
    });
  }

  /**
   * Query user's open orders
   * @param userAddress - User's wallet address
   */
  async getOpenOrders(userAddress: string) {
    try {
      return await this.infoClient.openOrders({ user: userAddress });
    } catch (error) {
      console.error('[HyperliquidClient] Failed to get open orders:', error);
      throw error;
    }
  }

  /**
   * Query user's clearinghouse state (positions, margin, etc.)
   * @param userAddress - User's wallet address
   */
  async getUserState(userAddress: string) {
    try {
      return await this.infoClient.clearinghouseState({ user: userAddress });
    } catch (error) {
      console.error('[HyperliquidClient] Failed to get user state:', error);
      throw error;
    }
  }

  /**
   * Query L2 orderbook for a specific symbol
   * @param symbol - Trading pair symbol (e.g., 'BTC')
   */
  async getOrderbook(symbol: string) {
    try {
      return await this.infoClient.l2Book({ coin: symbol });
    } catch (error) {
      console.error(`[HyperliquidClient] Failed to get orderbook for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Query all available trading symbols (metas)
   */
  async getAllMetas() {
    try {
      return await this.infoClient.meta();
    } catch (error) {
      console.error('[HyperliquidClient] Failed to get metas:', error);
      throw error;
    }
  }

  /**
   * Query all mid prices
   */
  async getAllMids() {
    try {
      return await this.infoClient.allMids();
    } catch (error) {
      console.error('[HyperliquidClient] Failed to get all mids:', error);
      throw error;
    }
  }

  /**
   * Query candle data for charting
   * @param symbol - Trading pair symbol
   * @param interval - Candle interval (e.g., '1m', '5m', '1h', '1d')
   * @param startTime - Start timestamp in milliseconds
   * @param endTime - End timestamp in milliseconds
   */
  async getCandleSnapshot(params: {
    symbol: string;
    interval: string;
    startTime: number;
    endTime: number;
  }) {
    try {
      return await this.infoClient.candleSnapshot({
        coin: params.symbol,
        interval: params.interval,
        startTime: params.startTime,
        endTime: params.endTime,
      });
    } catch (error) {
      console.error('[HyperliquidClient] Failed to get candle snapshot:', error);
      throw error;
    }
  }

  /**
   * Place an order on Hyperliquid
   * @param params - Order parameters
   */
  async placeOrder(params: {
    coin: string;
    isBuy: boolean;
    price: number;
    size: number;
    orderType: 'limit' | 'market';
    timeInForce?: 'Gtc' | 'Ioc' | 'Alo';
    reduceOnly?: boolean;
  }) {
    try {
      const orderRequest: any = {
        coin: params.coin,
        is_buy: params.isBuy,
        sz: params.size,
        limit_px: params.price,
        order_type: params.orderType === 'limit'
          ? { limit: { tif: params.timeInForce || 'Gtc' } }
          : { market: {} },
        reduce_only: params.reduceOnly || false,
      };

      const response = await this.exchangeClient.order(orderRequest);

      console.log('[HyperliquidClient] Order placed:', {
        coin: params.coin,
        side: params.isBuy ? 'buy' : 'sell',
        size: params.size,
        response,
      });

      return response;
    } catch (error) {
      console.error('[HyperliquidClient] Failed to place order:', error);
      throw error;
    }
  }

  /**
   * Cancel an order
   * @param orderId - Hyperliquid order ID (oid)
   * @param symbol - Trading pair symbol
   */
  async cancelOrder(orderId: string, symbol: string) {
    try {
      const response = await this.exchangeClient.cancel({
        cancels: [{ oid: orderId, coin: symbol }],
      });

      console.log('[HyperliquidClient] Order cancelled:', { orderId, symbol, response });
      return response;
    } catch (error) {
      console.error('[HyperliquidClient] Failed to cancel order:', error);
      throw error;
    }
  }

  /**
   * Cancel all orders for a specific symbol
   * @param symbol - Trading pair symbol
   */
  async cancelAllOrders(symbol: string) {
    try {
      const response = await this.exchangeClient.cancel({
        cancels: [{ coin: symbol }],
      });

      console.log('[HyperliquidClient] All orders cancelled for:', symbol);
      return response;
    } catch (error) {
      console.error('[HyperliquidClient] Failed to cancel all orders:', error);
      throw error;
    }
  }

  /**
   * Subscribe to orderbook updates via WebSocket
   * @param symbol - Trading pair symbol
   * @param callback - Callback function for orderbook updates
   */
  async subscribeToOrderbook(symbol: string, callback: (data: any) => void) {
    try {
      const subscription = await this.subscriptionClient.l2Book(
        { coin: symbol },
        (event) => {
          callback(event);
        }
      );

      console.log(`[HyperliquidClient] Subscribed to orderbook: ${symbol}`);
      return subscription;
    } catch (error) {
      console.error('[HyperliquidClient] Failed to subscribe to orderbook:', error);
      throw error;
    }
  }

  /**
   * Subscribe to trades stream via WebSocket
   * @param symbol - Trading pair symbol
   * @param callback - Callback function for trade updates
   */
  async subscribeToTrades(symbol: string, callback: (data: any) => void) {
    try {
      const subscription = await this.subscriptionClient.trades(
        { coin: symbol },
        (event) => {
          callback(event);
        }
      );

      console.log(`[HyperliquidClient] Subscribed to trades: ${symbol}`);
      return subscription;
    } catch (error) {
      console.error('[HyperliquidClient] Failed to subscribe to trades:', error);
      throw error;
    }
  }

  /**
   * Subscribe to user order events via WebSocket
   * @param userAddress - User's wallet address
   * @param callback - Callback function for user events
   */
  async subscribeToUserEvents(userAddress: string, callback: (data: any) => void) {
    try {
      const subscription = await this.subscriptionClient.userEvents(
        { user: userAddress },
        (event) => {
          callback(event);
        }
      );

      console.log(`[HyperliquidClient] Subscribed to user events: ${userAddress}`);
      return subscription;
    } catch (error) {
      console.error('[HyperliquidClient] Failed to subscribe to user events:', error);
      throw error;
    }
  }

  /**
   * Subscribe to all mid prices via WebSocket
   * @param callback - Callback function for mid price updates
   */
  async subscribeToAllMids(callback: (data: any) => void) {
    try {
      const subscription = await this.subscriptionClient.allMids((event) => {
        callback(event);
      });

      console.log('[HyperliquidClient] Subscribed to all mids');
      return subscription;
    } catch (error) {
      console.error('[HyperliquidClient] Failed to subscribe to all mids:', error);
      throw error;
    }
  }

  /**
   * Subscribe to candle updates via WebSocket
   * @param symbol - Trading pair symbol
   * @param interval - Candle interval
   * @param callback - Callback function for candle updates
   */
  async subscribeToCandles(
    symbol: string,
    interval: string,
    callback: (data: any) => void
  ) {
    try {
      const subscription = await this.subscriptionClient.candle(
        { coin: symbol, interval },
        (event) => {
          callback(event);
        }
      );

      console.log(`[HyperliquidClient] Subscribed to candles: ${symbol} ${interval}`);
      return subscription;
    } catch (error) {
      console.error('[HyperliquidClient] Failed to subscribe to candles:', error);
      throw error;
    }
  }

  /**
   * Get configuration
   */
  getConfig() {
    return {
      testnet: this.config.testnet,
      walletAddress: this.config.walletAddress,
    };
  }
}

/**
 * Singleton instance of HyperliquidClient
 */
let hyperliquidClientInstance: HyperliquidClient | null = null;

/**
 * Get the singleton instance of HyperliquidClient
 * Creates a new instance if one doesn't exist
 */
export function getHyperliquidClient(): HyperliquidClient {
  if (!hyperliquidClientInstance) {
    const testnet = process.env.HYPERLIQUID_TESTNET === 'true';
    const apiPrivateKey = process.env.HYPERLIQUID_API_PRIVATE_KEY || process.env.HYPERLIQUID_PRIVATE_KEY;
    const walletAddress = process.env.HYPERLIQUID_WALLET;

    if (!apiPrivateKey) {
      throw new Error(
        'HYPERLIQUID_API_PRIVATE_KEY or HYPERLIQUID_PRIVATE_KEY is required in environment variables'
      );
    }

    hyperliquidClientInstance = new HyperliquidClient({
      testnet,
      walletAddress,
      apiPrivateKey,
    });

    console.log(`[HyperliquidClient] Initialized (${testnet ? 'testnet' : 'mainnet'})`);
  }

  return hyperliquidClientInstance;
}

/**
 * Reset the singleton instance (useful for testing)
 */
export function resetHyperliquidClient() {
  hyperliquidClientInstance = null;
}
