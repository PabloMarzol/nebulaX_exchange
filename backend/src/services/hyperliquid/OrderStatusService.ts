import { EventEmitter } from 'events';
import { getHyperliquidClient } from './HyperliquidClient';
import { db } from '../../lib/db';
import { hyperliquidOrders, hyperliquidFills, type NewHyperliquidFill } from '../../../../shared/schema/hyperliquid.schema';
import { eq } from 'drizzle-orm';

/**
 * Order fill event
 */
export interface OrderFillEvent {
  userId: string;
  orderId: string;
  symbol: string;
  side: string;
  price: string;
  size: string;
  fee: string;
  timestamp: number;
}

/**
 * Order status change event
 */
export interface OrderStatusChangeEvent {
  userId: string;
  orderId: string;
  previousStatus: string;
  newStatus: string;
  timestamp: number;
}

/**
 * OrderStatusService
 *
 * Subscribes to Hyperliquid WebSocket for order status updates (fills, cancellations)
 * and automatically updates the database and emits events for real-time UI updates.
 *
 * Features:
 * - WebSocket subscription to user events
 * - Automatic database updates for fills
 * - Fill tracking in hyperliquid_fills table
 * - Event emission for Socket.io relay
 * - Error handling and reconnection
 */
export class OrderStatusService extends EventEmitter {
  private client = getHyperliquidClient();
  private subscriptions = new Map<string, any>(); // userAddress -> subscription

  constructor() {
    super();
    console.log('[OrderStatusService] Service initialized');
  }

  /**
   * Subscribe to order status updates for a user
   */
  async subscribeToUserOrders(userId: string, userAddress: string): Promise<void> {
    // Check if already subscribed
    if (this.subscriptions.has(userAddress)) {
      console.log(`[OrderStatusService] Already subscribed to user events: ${userAddress}`);
      return;
    }

    try {
      console.log(`[OrderStatusService] Subscribing to user events: ${userAddress}`);

      // Subscribe to user events WebSocket
      const subscription = await this.client.subscribeToUserEvents(userAddress, (data: any) => {
        this.handleUserEvent(userId, userAddress, data);
      });

      this.subscriptions.set(userAddress, subscription);
      console.log(`[OrderStatusService] Subscribed to user events: ${userAddress}`);
    } catch (error: any) {
      console.error(`[OrderStatusService] Failed to subscribe to user events:`, error);
      throw error;
    }
  }

  /**
   * Unsubscribe from order status updates for a user
   */
  async unsubscribeFromUserOrders(userAddress: string): Promise<void> {
    const subscription = this.subscriptions.get(userAddress);

    if (!subscription) {
      console.log(`[OrderStatusService] No subscription found for ${userAddress}`);
      return;
    }

    try {
      console.log(`[OrderStatusService] Unsubscribing from user events: ${userAddress}`);

      // Unsubscribe from WebSocket
      await subscription.unsubscribe();

      this.subscriptions.delete(userAddress);
      console.log(`[OrderStatusService] Unsubscribed from user events: ${userAddress}`);
    } catch (error: any) {
      console.error(`[OrderStatusService] Failed to unsubscribe:`, error);
      throw error;
    }
  }

  /**
   * Handle incoming user event from WebSocket
   */
  private async handleUserEvent(userId: string, userAddress: string, event: any): Promise<void> {
    try {
      // Hyperliquid user events include fills, orders, and more
      // Structure: { fills: [...], ...other events }

      if (event.fills && Array.isArray(event.fills)) {
        for (const fill of event.fills) {
          await this.handleFillEvent(userId, userAddress, fill);
        }
      }

      // Handle other event types as needed
      // e.g., order rejections, cancellations, etc.
    } catch (error: any) {
      console.error('[OrderStatusService] Error handling user event:', error);
    }
  }

  /**
   * Handle order fill event
   */
  private async handleFillEvent(userId: string, userAddress: string, fill: any): Promise<void> {
    try {
      const {
        oid,      // Hyperliquid order ID
        coin,     // Symbol
        side,     // 'A' (ask/sell) or 'B' (bid/buy)
        px,       // Fill price
        sz,       // Fill size
        fee,      // Fee paid
        time,     // Timestamp
        tid,      // Trade ID
        hash,     // Transaction hash
      } = fill;

      console.log(`[OrderStatusService] Processing fill: ${coin} ${side} ${sz}@${px}`);

      // Find order in database by Hyperliquid order ID
      const [order] = await db
        .select()
        .from(hyperliquidOrders)
        .where(eq(hyperliquidOrders.hyperliquidOrderId, oid))
        .limit(1);

      if (!order) {
        console.warn(`[OrderStatusService] Order not found for Hyperliquid order ID: ${oid}`);
        return;
      }

      // Calculate new filled size
      const currentFilledSize = parseFloat(order.filledSize || '0');
      const fillSize = parseFloat(sz);
      const newFilledSize = currentFilledSize + fillSize;
      const totalSize = parseFloat(order.size);
      const remainingSize = totalSize - newFilledSize;

      // Determine new order status
      const newStatus = remainingSize <= 0.00000001 ? 'filled' : 'partially_filled'; // Use small epsilon for float comparison

      // Calculate average fill price
      const currentAvgPrice = parseFloat(order.averageFillPrice || '0');
      const fillPrice = parseFloat(px);
      const newAvgPrice =
        currentFilledSize > 0
          ? (currentAvgPrice * currentFilledSize + fillPrice * fillSize) / newFilledSize
          : fillPrice;

      // Update order in database
      const updateData: any = {
        filledSize: newFilledSize.toString(),
        remainingSize: Math.max(0, remainingSize).toString(),
        averageFillPrice: newAvgPrice.toString(),
        status: newStatus,
        updatedAt: new Date(),
      };

      if (newStatus === 'filled') {
        updateData.filledAt = new Date(time);
      }

      await db
        .update(hyperliquidOrders)
        .set(updateData)
        .where(eq(hyperliquidOrders.id, order.id));

      // Save fill to hyperliquid_fills table
      const newFill: NewHyperliquidFill = {
        orderId: order.id,
        userId,
        hyperliquidFillId: tid,
        symbol: coin,
        side: side === 'B' ? 'buy' : 'sell',
        price: px,
        size: sz,
        fee,
        feeToken: 'USDC',
        isMaker: fill.maker || false,
        txHash: hash,
        metadata: fill,
      };

      await db.insert(hyperliquidFills).values(newFill);

      console.log(
        `[OrderStatusService] Order ${order.internalOrderId} updated: ${order.status} -> ${newStatus} (filled: ${newFilledSize}/${totalSize})`
      );

      // Emit fill event
      this.emit('orderFill', {
        userId,
        orderId: order.internalOrderId,
        symbol: coin,
        side: side === 'B' ? 'buy' : 'sell',
        price: px,
        size: sz,
        fee,
        timestamp: time,
      });

      // Emit status change event
      this.emit('orderStatusChange', {
        userId,
        orderId: order.internalOrderId,
        previousStatus: order.status,
        newStatus,
        timestamp: Date.now(),
      });
    } catch (error: any) {
      console.error('[OrderStatusService] Error handling fill event:', error);
    }
  }

  /**
   * Get active subscriptions count
   */
  getSubscriptionCount(): number {
    return this.subscriptions.size;
  }

  /**
   * Get active subscriptions
   */
  getActiveSubscriptions(): string[] {
    return Array.from(this.subscriptions.keys());
  }

  /**
   * Shutdown service and cleanup subscriptions
   */
  async shutdown(): Promise<void> {
    console.log('[OrderStatusService] Shutting down...');

    for (const [userAddress, subscription] of this.subscriptions.entries()) {
      try {
        await subscription.unsubscribe();
        console.log(`[OrderStatusService] Unsubscribed from ${userAddress}`);
      } catch (error) {
        console.error(`[OrderStatusService] Error unsubscribing from ${userAddress}:`, error);
      }
    }

    this.subscriptions.clear();
    this.removeAllListeners();
    console.log('[OrderStatusService] Shutdown complete');
  }
}

/**
 * Singleton instance
 */
let orderStatusServiceInstance: OrderStatusService | null = null;

/**
 * Get the singleton instance of OrderStatusService
 */
export function getOrderStatusService(): OrderStatusService {
  if (!orderStatusServiceInstance) {
    orderStatusServiceInstance = new OrderStatusService();
    console.log('[OrderStatusService] Instance created');
  }

  return orderStatusServiceInstance;
}

/**
 * Reset the singleton instance (useful for testing)
 */
export function resetOrderStatusService(): void {
  if (orderStatusServiceInstance) {
    orderStatusServiceInstance.shutdown();
    orderStatusServiceInstance = null;
  }
}
