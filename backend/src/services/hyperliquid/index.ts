/**
 * Hyperliquid Integration Module
 *
 * This module provides a complete integration with Hyperliquid's perpetual futures DEX.
 * It includes:
 * - HyperliquidClient: Core API client wrapper
 * - MarketDataService: WebSocket subscription management
 * - MarketDataCache: In-memory caching layer
 * - ReconnectionHandler: Automatic reconnection with exponential backoff
 * - Configuration: Environment validation and constants
 * - Database schema: Drizzle ORM schema for orders, positions, fills
 *
 * @example
 * ```typescript
 * import { getHyperliquidClient, getMarketDataService } from './services/hyperliquid';
 *
 * const client = getHyperliquidClient();
 * const marketData = getMarketDataService();
 *
 * // Subscribe to market data
 * await marketData.subscribeToOrderbook('BTC');
 * marketData.on('orderbook', ({ symbol, data }) => {
 *   console.log(`${symbol} orderbook:`, data);
 * });
 *
 * // Place an order
 * const result = await client.placeOrder({
 *   coin: 'BTC',
 *   isBuy: true,
 *   price: 50000,
 *   size: 0.01,
 *   orderType: 'limit',
 * });
 * ```
 */

// Phase 1: Core Client
export {
  HyperliquidClient,
  getHyperliquidClient,
  resetHyperliquidClient,
} from './HyperliquidClient';

// Phase 2: Market Data
export {
  MarketDataService,
  getMarketDataService,
  resetMarketDataService,
  type SubscriptionType,
  type OrderbookUpdate,
  type TradeUpdate,
  type CandleUpdate,
} from './MarketDataService';

export {
  MarketDataCache,
  getMarketDataCache,
  resetMarketDataCache,
  type CachedOrderbook,
  type CachedTrade,
} from './MarketDataCache';

export {
  ReconnectionHandler,
  createReconnectionHandler,
  withReconnection,
  type ReconnectionConfig,
  type ConnectionState,
  type ReconnectionCallback,
} from './ReconnectionHandler';

// Configuration
export {
  loadHyperliquidConfig,
  hyperliquidConfigSchema,
  HYPERLIQUID_CONSTANTS,
  type HyperliquidConfig,
  type OrderStatus,
  type OrderSide,
  type OrderType,
  type TimeInForce,
  type PositionSide,
  type CandleInterval,
} from './config';

// Database Schema
export {
  hyperliquidOrders,
  hyperliquidPositions,
  hyperliquidFills,
  hyperliquidReconciliations,
  hyperliquidUserStateCache,
  type HyperliquidOrder,
  type NewHyperliquidOrder,
  type HyperliquidPosition,
  type NewHyperliquidPosition,
  type HyperliquidFill,
  type NewHyperliquidFill,
  type HyperliquidReconciliation,
  type NewHyperliquidReconciliation,
  type HyperliquidUserStateCache,
  type NewHyperliquidUserStateCache,
} from '../../db/schema/hyperliquid';
