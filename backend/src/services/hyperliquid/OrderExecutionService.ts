import { HyperliquidClient } from './HyperliquidClient';
import { db } from '../../db/index.js';
import { hyperliquidOrders, hyperliquidFills, hyperliquidPositions } from '../../db/schema/hyperliquid.js';
import { eq, and, desc } from 'drizzle-orm';
import type { WsUserEvent } from '@nktkas/hyperliquid';

export interface PlaceOrderParams {
  userId: string;
  symbol: string;
  side: 'buy' | 'sell';
  type: 'limit' | 'market';
  price?: number;
  quantity: number;
  leverage?: number;
  timeInForce?: 'Gtc' | 'Ioc' | 'Alo';
  reduceOnly?: boolean;
  postOnly?: boolean;
}

export interface CancelOrderParams {
  userId: string;
  orderId: string;
  symbol: string;
}

/**
 * OrderExecutionService handles order placement, cancellation, and tracking
 * with proper database persistence and error handling.
 */
export class OrderExecutionService {
  private static instance: OrderExecutionService | null = null;
  private hlClient: HyperliquidClient;

  private constructor() {
    this.hlClient = HyperliquidClient.getInstance();
  }

  /**
   * Get singleton instance of OrderExecutionService
   */
  public static getInstance(): OrderExecutionService {
    if (!OrderExecutionService.instance) {
      OrderExecutionService.instance = new OrderExecutionService();
    }
    return OrderExecutionService.instance;
  }

  /**
   * Place a new order
   */
  public async placeOrder(params: PlaceOrderParams): Promise<any> {
    const {
      userId,
      symbol,
      side,
      type,
      price,
      quantity,
      leverage,
      timeInForce,
      reduceOnly,
      postOnly,
    } = params;

    try {
      // Validate parameters
      if (type === 'limit' && !price) {
        throw new Error('Price is required for limit orders');
      }

      if (quantity <= 0) {
        throw new Error('Quantity must be greater than 0');
      }

      // Prepare order parameters
      const orderParams: any = {
        coin: symbol,
        is_buy: side === 'buy',
        sz: quantity,
        limit_px: type === 'limit' ? price : undefined,
        order_type: this.mapOrderType(type, timeInForce),
        reduce_only: reduceOnly || false,
      };

      console.log('[OrderExecutionService] Placing order:', orderParams);

      // Place order on Hyperliquid
      const result = await this.hlClient.placeOrder(orderParams);

      if (result.status === 'err') {
        throw new Error(`Order placement failed: ${result.response}`);
      }

      // Store order in database (if available)
      const orderData = result.response.data?.statuses?.[0];
      if (orderData && db) {
        try {
          await db.insert(hyperliquidOrders).values({
            userId,
            symbol,
            orderId: orderData.resting?.oid?.toString() || `temp-${Date.now()}`,
            clientOrderId: null,
            side,
            type,
            price: price?.toString() || null,
            quantity: quantity.toString(),
            filledQuantity: '0',
            remainingQuantity: quantity.toString(),
            status: 'open',
            timeInForce: timeInForce || 'Gtc',
            reduceOnly: reduceOnly || false,
            postOnly: postOnly || false,
            leverage: leverage?.toString() || null,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        } catch (dbError) {
          console.warn('[OrderExecutionService] Database not available, skipping order persistence');
        }
      }

      console.log('[OrderExecutionService] Order placed successfully:', result);

      return {
        success: true,
        data: result.response,
      };
    } catch (error) {
      console.error('[OrderExecutionService] Failed to place order:', error);
      throw error;
    }
  }

  /**
   * Cancel an existing order
   */
  public async cancelOrder(params: CancelOrderParams): Promise<any> {
    const { userId, orderId, symbol } = params;

    try {
      console.log('[OrderExecutionService] Canceling order:', { orderId, symbol });

      // Cancel order on Hyperliquid
      const result = await this.hlClient.cancelOrder({
        coin: symbol,
        o: parseInt(orderId),
      });

      if (result.status === 'err') {
        throw new Error(`Order cancellation failed: ${result.response}`);
      }

      // Update order status in database (if available)
      if (db) {
        try {
          await db
            .update(hyperliquidOrders)
            .set({
              status: 'cancelled',
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(hyperliquidOrders.userId, userId),
                eq(hyperliquidOrders.orderId, orderId)
              )
            );
        } catch (dbError) {
          console.warn('[OrderExecutionService] Database not available, skipping status update');
        }
      }

      console.log('[OrderExecutionService] Order cancelled successfully:', result);

      return {
        success: true,
        data: result.response,
      };
    } catch (error) {
      console.error('[OrderExecutionService] Failed to cancel order:', error);
      throw error;
    }
  }

  /**
   * Cancel all orders for a user
   */
  public async cancelAllOrders(userId: string, symbol?: string): Promise<any> {
    try {
      console.log('[OrderExecutionService] Canceling all orders for user:', userId);

      // Get all open orders from database (if available)
      let openOrders: any[] = [];
      if (db) {
        try {
          openOrders = await db
            .select()
            .from(hyperliquidOrders)
            .where(
              and(
                eq(hyperliquidOrders.userId, userId),
                eq(hyperliquidOrders.status, 'open'),
                symbol ? eq(hyperliquidOrders.symbol, symbol) : undefined
              )
            );
        } catch (dbError) {
          console.warn('[OrderExecutionService] Database not available for cancel all');
          return {
            success: false,
            error: 'Database not available - cannot retrieve orders to cancel',
          };
        }
      } else {
        return {
          success: false,
          error: 'Database not configured - cannot retrieve orders to cancel',
        };
      }

      // Cancel each order
      const results = await Promise.allSettled(
        openOrders.map((order) =>
          this.cancelOrder({
            userId,
            orderId: order.orderId,
            symbol: order.symbol,
          })
        )
      );

      const successCount = results.filter((r) => r.status === 'fulfilled').length;
      const failedCount = results.filter((r) => r.status === 'rejected').length;

      return {
        success: true,
        data: {
          total: openOrders.length,
          cancelled: successCount,
          failed: failedCount,
        },
      };
    } catch (error) {
      console.error('[OrderExecutionService] Failed to cancel all orders:', error);
      throw error;
    }
  }

  /**
   * Get user's open orders
   */
  public async getOpenOrders(userId: string, symbol?: string): Promise<any[]> {
    if (!db) {
      console.warn('[OrderExecutionService] Database not available for getOpenOrders');
      return [];
    }

    try {
      const openOrders = await db
        .select()
        .from(hyperliquidOrders)
        .where(
          and(
            eq(hyperliquidOrders.userId, userId),
            eq(hyperliquidOrders.status, 'open'),
            symbol ? eq(hyperliquidOrders.symbol, symbol) : undefined
          )
        )
        .orderBy(desc(hyperliquidOrders.createdAt));

      return openOrders;
    } catch (error) {
      console.error('[OrderExecutionService] Failed to get open orders:', error);
      return [];
    }
  }

  /**
   * Get user's order history
   */
  public async getOrderHistory(
    userId: string,
    symbol?: string,
    limit: number = 100
  ): Promise<any[]> {
    if (!db) {
      console.warn('[OrderExecutionService] Database not available for getOrderHistory');
      return [];
    }

    try {
      const orders = await db
        .select()
        .from(hyperliquidOrders)
        .where(
          and(
            eq(hyperliquidOrders.userId, userId),
            symbol ? eq(hyperliquidOrders.symbol, symbol) : undefined
          )
        )
        .orderBy(desc(hyperliquidOrders.createdAt))
        .limit(limit);

      return orders;
    } catch (error) {
      console.error('[OrderExecutionService] Failed to get order history:', error);
      return [];
    }
  }

  /**
   * Get user's positions
   */
  public async getPositions(userId: string, symbol?: string): Promise<any[]> {
    try {
      // First, try to get from Hyperliquid API
      const userState = await this.hlClient.getClearinghouseState(userId);

      if (userState.assetPositions && userState.assetPositions.length > 0) {
        // Update database with latest positions (if available)
        if (db) {
          try {
            for (const position of userState.assetPositions) {
              const coin = position.position.coin;

              // Skip if symbol filter is set and doesn't match
              if (symbol && coin !== symbol) continue;

              await db
                .insert(hyperliquidPositions)
                .values({
                  userId,
                  symbol: coin,
                  side: parseFloat(position.position.szi) > 0 ? 'long' : 'short',
                  quantity: Math.abs(parseFloat(position.position.szi)).toString(),
                  entryPrice: position.position.entryPx || '0',
                  markPrice: position.position.positionValue || '0',
                  liquidationPrice: position.position.liquidationPx || null,
                  leverage: position.position.leverage?.value?.toString() || null,
                  unrealizedPnl: position.position.unrealizedPnl || '0',
                  margin: position.position.marginUsed || '0',
                  createdAt: new Date(),
                  updatedAt: new Date(),
                })
                .onConflictDoUpdate({
                  target: [hyperliquidPositions.userId, hyperliquidPositions.symbol],
                  set: {
                    side: parseFloat(position.position.szi) > 0 ? 'long' : 'short',
                    quantity: Math.abs(parseFloat(position.position.szi)).toString(),
                    entryPrice: position.position.entryPx || '0',
                    markPrice: position.position.positionValue || '0',
                    liquidationPrice: position.position.liquidationPx || null,
                    leverage: position.position.leverage?.value?.toString() || null,
                    unrealizedPnl: position.position.unrealizedPnl || '0',
                    margin: position.position.marginUsed || '0',
                    updatedAt: new Date(),
                  },
                });
            }
          } catch (dbError) {
            console.warn('[OrderExecutionService] Database not available for position updates');
          }
        }

        // Return filtered positions
        return userState.assetPositions
          .filter((p) => !symbol || p.position.coin === symbol)
          .map((p) => ({
            symbol: p.position.coin,
            side: parseFloat(p.position.szi) > 0 ? 'long' : 'short',
            quantity: Math.abs(parseFloat(p.position.szi)),
            entryPrice: p.position.entryPx,
            markPrice: p.position.positionValue,
            liquidationPrice: p.position.liquidationPx,
            leverage: p.position.leverage?.value,
            unrealizedPnl: p.position.unrealizedPnl,
            margin: p.position.marginUsed,
          }));
      }

      // Fallback to database if API fails (if database available)
      if (db) {
        try {
          const positions = await db
            .select()
            .from(hyperliquidPositions)
            .where(
              and(
                eq(hyperliquidPositions.userId, userId),
                symbol ? eq(hyperliquidPositions.symbol, symbol) : undefined
              )
            )
            .orderBy(desc(hyperliquidPositions.updatedAt));

          return positions;
        } catch (dbError) {
          console.warn('[OrderExecutionService] Database not available for positions fallback');
        }
      }

      return [];
    } catch (error) {
      console.error('[OrderExecutionService] Failed to get positions:', error);
      throw error;
    }
  }

  /**
   * Handle user event from WebSocket (fills, order updates, etc.)
   */
  public async handleUserEvent(userId: string, event: WsUserEvent): Promise<void> {
    try {
      if (event.channel === 'user' && event.data.fills) {
        // Handle fills
        for (const fill of event.data.fills) {
          await this.handleFill(userId, fill);
        }
      }
    } catch (error) {
      console.error('[OrderExecutionService] Failed to handle user event:', error);
    }
  }

  /**
   * Handle individual fill
   */
  private async handleFill(userId: string, fill: any): Promise<void> {
    if (!db) {
      console.warn('[OrderExecutionService] Database not available, skipping fill persistence');
      return;
    }

    try {
      // Store fill in database
      await db.insert(hyperliquidFills).values({
        userId,
        orderId: fill.oid?.toString() || null,
        symbol: fill.coin,
        side: fill.side === 'B' ? 'buy' : 'sell',
        price: fill.px,
        quantity: fill.sz,
        fee: fill.fee,
        feeToken: fill.feeToken || 'USDC',
        liquidation: fill.liquidation || false,
        timestamp: new Date(fill.time),
        createdAt: new Date(),
      });

      // Update order status
      if (fill.oid) {
        const order = await db
          .select()
          .from(hyperliquidOrders)
          .where(
            and(
              eq(hyperliquidOrders.userId, userId),
              eq(hyperliquidOrders.orderId, fill.oid.toString())
            )
          )
          .limit(1);

        if (order.length > 0) {
          const currentFilled = parseFloat(order[0].filledQuantity);
          const fillSize = parseFloat(fill.sz);
          const newFilled = currentFilled + fillSize;
          const totalSize = parseFloat(order[0].quantity);

          await db
            .update(hyperliquidOrders)
            .set({
              filledQuantity: newFilled.toString(),
              remainingQuantity: (totalSize - newFilled).toString(),
              status: newFilled >= totalSize ? 'filled' : 'partially_filled',
              updatedAt: new Date(),
            })
            .where(eq(hyperliquidOrders.id, order[0].id));
        }
      }
    } catch (error) {
      console.error('[OrderExecutionService] Failed to handle fill:', error);
      // Don't throw - this is a background operation
    }
  }

  /**
   * Map frontend order type to Hyperliquid order type
   */
  private mapOrderType(
    type: 'limit' | 'market',
    timeInForce?: 'Gtc' | 'Ioc' | 'Alo'
  ): any {
    if (type === 'market') {
      return { market: {} };
    }

    if (timeInForce === 'Ioc') {
      return { limit: { tif: 'Ioc' } };
    }

    if (timeInForce === 'Alo') {
      return { limit: { tif: 'Alo' } };
    }

    return { limit: { tif: 'Gtc' } };
  }
}

export default OrderExecutionService;
