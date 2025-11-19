/**
 * Hyperliquid Integration Module
 *
 * This module provides a complete integration with Hyperliquid's perpetual futures DEX.
 * It includes:
 * - HyperliquidClient: Core API client wrapper
 * - Configuration: Environment validation and constants
 * - Database schema: Drizzle ORM schema for orders, positions, fills
 *
 * @example
 * ```typescript
 * import { getHyperliquidClient, HYPERLIQUID_CONSTANTS } from './services/hyperliquid';
 *
 * const client = getHyperliquidClient();
 *
 * // Place an order
 * const result = await client.placeOrder({
 *   coin: 'BTC',
 *   isBuy: true,
 *   price: 50000,
 *   size: 0.01,
 *   orderType: 'limit',
 * });
 *
 * // Subscribe to orderbook
 * await client.subscribeToOrderbook('BTC', (data) => {
 *   console.log('Orderbook update:', data);
 * });
 * ```
 */

export {
  HyperliquidClient,
  getHyperliquidClient,
  resetHyperliquidClient,
} from './HyperliquidClient';

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
