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
 * Phase 4 - Position Management:
 * - PositionManagementService: Position tracking and P&L calculations
 *
 * Phase 5 - Error Handling & Resilience:
 * - CircuitBreaker: Prevents cascading failures
 * - RetryHandler: Exponential backoff retry logic
 * - RateLimiter: Token bucket rate limiting
 * - ReconciliationService: Order and position reconciliation
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

// Phase 4: Position Management
export {
  PositionManagementService,
  getPositionManagementService,
  resetPositionManagementService,
  type PositionUpdateEvent,
  type PositionClosedEvent,
} from './PositionManagementService';

// Phase 5: Error Handling & Resilience
export {
  CircuitBreaker,
  createCircuitBreaker,
  CircuitState,
  type CircuitBreakerConfig,
  type CircuitBreakerStats,
} from './CircuitBreaker';

export {
  RetryHandler,
  createRetryHandler,
  retryWithBackoff,
  type RetryConfig,
  type RetryStats,
} from './RetryHandler';

export {
  RateLimiter,
  createRateLimiter,
  type RateLimiterConfig,
  type RateLimiterStats,
} from './RateLimiter';

export {
  ReconciliationService,
  getReconciliationService,
  resetReconciliationService,
  type DiscrepancyEvent,
  type ReconciliationResult,
} from './ReconciliationService';

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
} from "@shared/schema/hyperliquid.schema";
