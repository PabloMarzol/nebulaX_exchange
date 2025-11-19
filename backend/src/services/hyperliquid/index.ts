/**
 * Hyperliquid Integration Module
 *
 * This module provides a complete integration with Hyperliquid's perpetual futures DEX.
 *
 * Phase 1 - Core Infrastructure:
 * - HyperliquidClient: Core API client wrapper
 * - Configuration: Environment validation and constants
 * - Database schema: Drizzle ORM schema for orders, positions, fills
 *
 * Phase 2 - Market Data:
 * - MarketDataService: WebSocket subscription management
 * - MarketDataCache: In-memory caching layer
 * - ReconnectionHandler: Automatic reconnection with exponential backoff
 *
 * Phase 3 - Order Placement:
 * - OrderExecutionService: Order placement with validation and persistence
 * - OrderStatusService: Real-time order status tracking via WebSocket
 *
 * @example
 * ```typescript
 * import {
 *   getHyperliquidClient,
 *   getMarketDataService,
 *   getOrderExecutionService,
 * } from './services/hyperliquid';
 *
 * const client = getHyperliquidClient();
 * const marketData = getMarketDataService();
 * const orderService = getOrderExecutionService();
 *
 * // Subscribe to market data
 * await marketData.subscribeToOrderbook('BTC');
 * marketData.on('orderbook', ({ symbol, data }) => {
 *   console.log(`${symbol} orderbook:`, data);
 * });
 *
 * // Place an order
 * const result = await orderService.placeOrder({
 *   userId: 'user-123',
 *   userAddress: '0x...',
 *   symbol: 'BTC',
 *   side: 'buy',
 *   orderType: 'limit',
 *   price: 50000,
 *   size: 0.01,
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

// Phase 3: Order Placement & Management
export {
  OrderExecutionService,
  getOrderExecutionService,
  resetOrderExecutionService,
  OrderValidationError,
  type PlaceOrderParams,
  type OrderPlacementResult,
  type CancelOrderParams,
} from './OrderExecutionService';

export {
  OrderStatusService,
  getOrderStatusService,
  resetOrderStatusService,
  type OrderFillEvent,
  type OrderStatusChangeEvent,
} from './OrderStatusService';

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
} from '../../../shared/schema/hyperliquid.schema';
