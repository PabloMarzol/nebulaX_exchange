import { EventEmitter } from 'events';
import { getHyperliquidClient } from './HyperliquidClient';
import { getOrderExecutionService } from './OrderExecutionService';
import { db } from '../../lib/db';
import { hyperliquidPositions, type NewHyperliquidPosition, type HyperliquidPosition } from '../../../../shared/schema/hyperliquid.schema';
import { eq, and, isNull } from 'drizzle-orm';

/**
 * Position update event
 */
export interface PositionUpdateEvent {
  userId: string;
  symbol: string;
  side: 'long' | 'short';
  size: string;
  entryPrice: string;
  markPrice: string;
  unrealizedPnl: string;
  liquidationPrice: string;
  leverage: string;
}

/**
 * Position closed event
 */
export interface PositionClosedEvent {
  userId: string;
  symbol: string;
  side: 'long' | 'short';
  closePrice: string;
  realizedPnl: string;
}

/**
 * PositionManagementService
 *
 * Manages user positions on Hyperliquid including:
 * - Querying positions from Hyperliquid API
 * - Calculating unrealized P&L
 * - Calculating liquidation prices
 * - Saving positions to database
 * - Closing positions (creating reduce-only orders)
 * - Real-time position tracking
 *
 * Features:
 * - Automatic position synchronization
 * - P&L calculations with mark price
 * - Liquidation price estimation
 * - Margin usage tracking
 * - Position close orders
 * - Event emission for real-time updates
 */
export class PositionManagementService extends EventEmitter {
  private client = getHyperliquidClient();
  private orderService = getOrderExecutionService();

  // Cache for position polling
  private positionPollingIntervals = new Map<string, NodeJS.Timeout>();

  constructor() {
    super();
    console.log('[PositionManagementService] Service initialized');
  }

  /**
   * Get user positions from Hyperliquid API
   */
  async getUserPositions(userAddress: string): Promise<any[]> {
    try {
      console.log(`[PositionManagementService] Fetching positions for ${userAddress}`);

      const userState = await this.client.getUserState(userAddress);

      if (!userState?.assetPositions || userState.assetPositions.length === 0) {
        console.log(`[PositionManagementService] No positions found for ${userAddress}`);
        return [];
      }

      // Filter out positions with zero size
      const positions = userState.assetPositions.filter((pos: any) => {
        const size = parseFloat(pos.position.szi);
        return size !== 0;
      });

      console.log(`[PositionManagementService] Found ${positions.length} open positions`);
      return positions;
    } catch (error: any) {
      console.error('[PositionManagementService] Error fetching positions:', error);
      throw new Error(`Failed to fetch positions: ${error.message}`);
    }
  }

  /**
   * Calculate unrealized P&L for a position
   */
  calculateUnrealizedPnl(params: {
    side: 'long' | 'short';
    size: number;
    entryPrice: number;
    markPrice: number;
  }): number {
    const { side, size, entryPrice, markPrice } = params;

    if (side === 'long') {
      // Long: PnL = (markPrice - entryPrice) * size
      return (markPrice - entryPrice) * size;
    } else {
      // Short: PnL = (entryPrice - markPrice) * size
      return (entryPrice - markPrice) * size;
    }
  }

  /**
   * Calculate liquidation price for a position
   *
   * Simplified calculation based on maintenance margin
   * Formula:
   * - Long: liquidationPrice = entryPrice * (1 - (1 / leverage) + maintenanceMarginRate)
   * - Short: liquidationPrice = entryPrice * (1 + (1 / leverage) - maintenanceMarginRate)
   *
   * Note: This is a simplified calculation. Hyperliquid's actual liquidation
   * calculation may be more complex and include funding rates, fees, etc.
   */
  calculateLiquidationPrice(params: {
    side: 'long' | 'short';
    entryPrice: number;
    leverage: number;
    maintenanceMarginRate?: number;
  }): number {
    const { side, entryPrice, leverage, maintenanceMarginRate = 0.03 } = params;

    if (side === 'long') {
      // Long liquidation price
      const liquidationPrice = entryPrice * (1 - (1 / leverage) + maintenanceMarginRate);
      return Math.max(0, liquidationPrice); // Can't be negative
    } else {
      // Short liquidation price
      const liquidationPrice = entryPrice * (1 + (1 / leverage) - maintenanceMarginRate);
      return liquidationPrice;
    }
  }

  /**
   * Calculate margin used for a position
   */
  calculateMarginUsed(params: { size: number; entryPrice: number; leverage: number }): number {
    const { size, entryPrice, leverage } = params;
    const positionValue = size * entryPrice;
    return positionValue / leverage;
  }

  /**
   * Sync user positions from Hyperliquid to database
   */
  async syncUserPositions(userId: string, userAddress: string): Promise<HyperliquidPosition[]> {
    try {
      console.log(`[PositionManagementService] Syncing positions for user ${userId}`);

      // Fetch positions from Hyperliquid
      const apiPositions = await this.getUserPositions(userAddress);

      // Get current mid prices for P&L calculation
      const mids = await this.client.getAllMids();

      const syncedPositions: HyperliquidPosition[] = [];

      for (const apiPos of apiPositions) {
        const coin = apiPos.position.coin;
        const szi = parseFloat(apiPos.position.szi);
        const entryPx = parseFloat(apiPos.position.entryPx);
        const positionValue = parseFloat(apiPos.position.positionValue);
        const unrealizedPnl = parseFloat(apiPos.position.unrealizedPnl);
        const leverage = parseFloat(apiPos.position.leverage?.value || '10');
        const liquidationPx = parseFloat(apiPos.position.liquidationPx || '0');
        const marginUsed = parseFloat(apiPos.position.marginUsed);

        // Determine side
        const side: 'long' | 'short' = szi > 0 ? 'long' : 'short';
        const size = Math.abs(szi);

        // Get current mark price
        const markPrice = parseFloat(mids[coin] || entryPx.toString());

        // Calculate unrealized P&L (use API value if available, otherwise calculate)
        const calculatedPnl = this.calculateUnrealizedPnl({
          side,
          size,
          entryPrice: entryPx,
          markPrice,
        });

        const finalPnl = unrealizedPnl !== 0 ? unrealizedPnl : calculatedPnl;

        // Check if position already exists in database
        const [existingPosition] = await db
          .select()
          .from(hyperliquidPositions)
          .where(
            and(
              eq(hyperliquidPositions.userId, userId),
              eq(hyperliquidPositions.symbol, coin),
              isNull(hyperliquidPositions.closedAt)
            )
          )
          .limit(1);

        if (existingPosition) {
          // Update existing position
          const [updatedPosition] = await db
            .update(hyperliquidPositions)
            .set({
              side,
              size: size.toString(),
              entryPrice: entryPx.toString(),
              markPrice: markPrice.toString(),
              liquidationPrice: liquidationPx > 0 ? liquidationPx.toString() : null,
              unrealizedPnl: finalPnl.toString(),
              leverage: leverage.toString(),
              marginUsed: marginUsed.toString(),
              updatedAt: new Date(),
            })
            .where(eq(hyperliquidPositions.id, existingPosition.id))
            .returning();

          syncedPositions.push(updatedPosition);

          // Emit position update event
          this.emit('positionUpdate', {
            userId,
            symbol: coin,
            side,
            size: size.toString(),
            entryPrice: entryPx.toString(),
            markPrice: markPrice.toString(),
            unrealizedPnl: finalPnl.toString(),
            liquidationPrice: liquidationPx > 0 ? liquidationPx.toString() : null,
            leverage: leverage.toString(),
          } as PositionUpdateEvent);
        } else {
          // Create new position
          const newPosition: NewHyperliquidPosition = {
            userId,
            symbol: coin,
            side,
            size: size.toString(),
            entryPrice: entryPx.toString(),
            markPrice: markPrice.toString(),
            liquidationPrice: liquidationPx > 0 ? liquidationPx.toString() : null,
            unrealizedPnl: finalPnl.toString(),
            realizedPnl: '0',
            leverage: leverage.toString(),
            marginUsed: marginUsed.toString(),
            marginMode: 'cross', // Hyperliquid uses cross margin by default
          };

          const [createdPosition] = await db
            .insert(hyperliquidPositions)
            .values(newPosition)
            .returning();

          syncedPositions.push(createdPosition);

          // Emit position update event
          this.emit('positionUpdate', {
            userId,
            symbol: coin,
            side,
            size: size.toString(),
            entryPrice: entryPx.toString(),
            markPrice: markPrice.toString(),
            unrealizedPnl: finalPnl.toString(),
            liquidationPrice: liquidationPx > 0 ? liquidationPx.toString() : null,
            leverage: leverage.toString(),
          } as PositionUpdateEvent);
        }
      }

      // Close positions in database that no longer exist on Hyperliquid
      const dbPositions = await db
        .select()
        .from(hyperliquidPositions)
        .where(and(eq(hyperliquidPositions.userId, userId), isNull(hyperliquidPositions.closedAt)));

      const apiSymbols = new Set(apiPositions.map((pos) => pos.position.coin));

      for (const dbPos of dbPositions) {
        if (!apiSymbols.has(dbPos.symbol)) {
          // Position was closed
          await db
            .update(hyperliquidPositions)
            .set({
              closedAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(hyperliquidPositions.id, dbPos.id));

          console.log(`[PositionManagementService] Position closed: ${dbPos.symbol}`);

          // Emit position closed event
          this.emit('positionClosed', {
            userId,
            symbol: dbPos.symbol,
            side: dbPos.side,
            closePrice: dbPos.markPrice,
            realizedPnl: dbPos.realizedPnl,
          } as PositionClosedEvent);
        }
      }

      console.log(`[PositionManagementService] Synced ${syncedPositions.length} positions`);
      return syncedPositions;
    } catch (error: any) {
      console.error('[PositionManagementService] Error syncing positions:', error);
      throw error;
    }
  }

  /**
   * Get user positions from database
   */
  async getUserPositionsFromDb(userId: string, includeClosedPositions = false): Promise<HyperliquidPosition[]> {
    try {
      const query = db.select().from(hyperliquidPositions).where(eq(hyperliquidPositions.userId, userId));

      if (!includeClosedPositions) {
        query.where(isNull(hyperliquidPositions.closedAt));
      }

      const positions = await query;
      return positions;
    } catch (error: any) {
      console.error('[PositionManagementService] Error fetching positions from database:', error);
      throw error;
    }
  }

  /**
   * Get a specific position from database
   */
  async getPositionBySymbol(userId: string, symbol: string): Promise<HyperliquidPosition | null> {
    try {
      const [position] = await db
        .select()
        .from(hyperliquidPositions)
        .where(
          and(
            eq(hyperliquidPositions.userId, userId),
            eq(hyperliquidPositions.symbol, symbol),
            isNull(hyperliquidPositions.closedAt)
          )
        )
        .limit(1);

      return position || null;
    } catch (error: any) {
      console.error('[PositionManagementService] Error fetching position:', error);
      throw error;
    }
  }

  /**
   * Close a position by creating a reduce-only order
   */
  async closePosition(params: {
    userId: string;
    userAddress: string;
    symbol: string;
    orderType?: 'market' | 'limit';
    limitPrice?: number;
  }): Promise<{ success: boolean; orderId?: string; message?: string; error?: string }> {
    try {
      const { userId, userAddress, symbol, orderType = 'market', limitPrice } = params;

      // Get current position from database
      const position = await this.getPositionBySymbol(userId, symbol);

      if (!position) {
        return {
          success: false,
          error: 'Position not found',
        };
      }

      // Determine order side (opposite of position side)
      const orderSide = position.side === 'long' ? 'sell' : 'buy';
      const positionSize = parseFloat(position.size);

      console.log(
        `[PositionManagementService] Closing ${position.side} position: ${symbol} (size: ${positionSize})`
      );

      // Get current mark price if market order
      let price = limitPrice;
      if (orderType === 'market' && !price) {
        const mids = await this.client.getAllMids();
        price = parseFloat(mids[symbol]);
      }

      // Place reduce-only order
      const orderResult = await this.orderService.placeOrder({
        userId,
        userAddress,
        symbol,
        side: orderSide,
        orderType,
        price,
        size: positionSize,
        reduceOnly: true, // Critical: This ensures we only close, not reverse
        timeInForce: orderType === 'market' ? 'Ioc' : 'Gtc',
      });

      if (orderResult.success) {
        return {
          success: true,
          orderId: orderResult.internalOrderId,
          message: `Position close order placed successfully`,
        };
      } else {
        return {
          success: false,
          error: orderResult.error,
          message: orderResult.message,
        };
      }
    } catch (error: any) {
      console.error('[PositionManagementService] Error closing position:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Start polling positions for a user
   * Useful for real-time position tracking without WebSocket
   */
  async startPositionPolling(userId: string, userAddress: string, intervalMs: number = 5000): Promise<void> {
    // Clear existing interval if any
    this.stopPositionPolling(userId);

    console.log(`[PositionManagementService] Starting position polling for user ${userId} (interval: ${intervalMs}ms)`);

    // Initial sync
    await this.syncUserPositions(userId, userAddress);

    // Set up polling
    const interval = setInterval(async () => {
      try {
        await this.syncUserPositions(userId, userAddress);
      } catch (error) {
        console.error('[PositionManagementService] Error in position polling:', error);
      }
    }, intervalMs);

    this.positionPollingIntervals.set(userId, interval);
  }

  /**
   * Stop polling positions for a user
   */
  stopPositionPolling(userId: string): void {
    const interval = this.positionPollingIntervals.get(userId);
    if (interval) {
      clearInterval(interval);
      this.positionPollingIntervals.delete(userId);
      console.log(`[PositionManagementService] Stopped position polling for user ${userId}`);
    }
  }

  /**
   * Get margin summary for a user
   */
  async getMarginSummary(userAddress: string): Promise<{
    accountValue: number;
    totalMarginUsed: number;
    availableMargin: number;
    totalUnrealizedPnl: number;
    marginRatio: number;
  } | null> {
    try {
      const userState = await this.client.getUserState(userAddress);

      if (!userState) {
        return null;
      }

      const accountValue = parseFloat(userState.marginSummary?.accountValue || '0');
      const totalMarginUsed = parseFloat(userState.marginSummary?.totalMarginUsed || '0');
      const totalUnrealizedPnl = parseFloat(userState.marginSummary?.totalNtlPos || '0');

      const availableMargin = accountValue - totalMarginUsed;
      const marginRatio = accountValue > 0 ? (totalMarginUsed / accountValue) * 100 : 0;

      return {
        accountValue,
        totalMarginUsed,
        availableMargin,
        totalUnrealizedPnl,
        marginRatio,
      };
    } catch (error: any) {
      console.error('[PositionManagementService] Error fetching margin summary:', error);
      throw error;
    }
  }

  /**
   * Shutdown service and cleanup
   */
  async shutdown(): Promise<void> {
    console.log('[PositionManagementService] Shutting down...');

    // Stop all polling intervals
    for (const [userId, interval] of this.positionPollingIntervals.entries()) {
      clearInterval(interval);
      console.log(`[PositionManagementService] Stopped polling for user ${userId}`);
    }

    this.positionPollingIntervals.clear();
    this.removeAllListeners();

    console.log('[PositionManagementService] Shutdown complete');
  }
}

/**
 * Singleton instance
 */
let positionManagementServiceInstance: PositionManagementService | null = null;

/**
 * Get the singleton instance of PositionManagementService
 */
export function getPositionManagementService(): PositionManagementService {
  if (!positionManagementServiceInstance) {
    positionManagementServiceInstance = new PositionManagementService();
    console.log('[PositionManagementService] Instance created');
  }

  return positionManagementServiceInstance;
}

/**
 * Reset the singleton instance (useful for testing)
 */
export function resetPositionManagementService(): void {
  if (positionManagementServiceInstance) {
    positionManagementServiceInstance.shutdown();
    positionManagementServiceInstance = null;
  }
}
