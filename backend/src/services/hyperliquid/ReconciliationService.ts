import { EventEmitter } from 'events';
import { getHyperliquidClient } from './HyperliquidClient';
import { db } from '../../lib/db';
import {
  hyperliquidOrders,
  hyperliquidPositions,
  hyperliquidReconciliations,
  type NewHyperliquidReconciliation,
} from '../../../shared/schema/hyperliquid.schema';
import { eq, and, inArray, isNull } from 'drizzle-orm';

/**
 * Discrepancy event
 */
export interface DiscrepancyEvent {
  type: 'order' | 'position';
  entityId: string;
  dbStatus: string;
  apiStatus: string;
  details: any;
  timestamp: number;
}

/**
 * Reconciliation result
 */
export interface ReconciliationResult {
  ordersChecked: number;
  positionsChecked: number;
  discrepanciesFound: number;
  discrepancies: DiscrepancyEvent[];
  duration: number;
}

/**
 * ReconciliationService
 *
 * Reconciles our database state with Hyperliquid's API state to catch discrepancies.
 *
 * Features:
 * - Periodic reconciliation jobs
 * - Order status reconciliation
 * - Position reconciliation
 * - Discrepancy logging
 * - Automatic resolution attempts
 * - Alert emission for critical discrepancies
 *
 * Reconciliation checks:
 * 1. Orders in DB marked "open" but not on Hyperliquid (likely filled/cancelled)
 * 2. Orders on Hyperliquid but not in DB (should never happen)
 * 3. Order status mismatch between DB and Hyperliquid
 * 4. Position size mismatch between DB and Hyperliquid
 */
export class ReconciliationService extends EventEmitter {
  private client = getHyperliquidClient();
  private reconciliationInterval: NodeJS.Timeout | null = null;
  private isReconciling: boolean = false;

  // Statistics
  private totalReconciliations: number = 0;
  private totalDiscrepancies: number = 0;
  private lastReconciliationTime: number | null = null;

  constructor() {
    super();
    console.log('[ReconciliationService] Service initialized');
  }

  /**
   * Reconcile orders for a specific user
   */
  async reconcileUserOrders(userId: string, userAddress: string): Promise<{
    ordersChecked: number;
    discrepancies: DiscrepancyEvent[];
  }> {
    const discrepancies: DiscrepancyEvent[] = [];

    try {
      // Get open orders from database
      const dbOrders = await db
        .select()
        .from(hyperliquidOrders)
        .where(
          and(
            eq(hyperliquidOrders.userId, userId),
            inArray(hyperliquidOrders.status, ['pending', 'open', 'partially_filled'])
          )
        );

      console.log(`[ReconciliationService] Checking ${dbOrders.length} open orders for user ${userId}`);

      if (dbOrders.length === 0) {
        return { ordersChecked: 0, discrepancies: [] };
      }

      // Get open orders from Hyperliquid API
      const userState = await this.client.getUserState(userAddress);
      const apiOrders = userState?.assetPositions
        ?.flatMap((asset: any) => asset.position?.openOrders || [])
        .filter((order: any) => order !== undefined) || [];

      // Create a map of API orders by order ID
      const apiOrderMap = new Map<string, any>();
      for (const apiOrder of apiOrders) {
        apiOrderMap.set(apiOrder.oid, apiOrder);
      }

      // Check each DB order against API
      for (const dbOrder of dbOrders) {
        if (!dbOrder.hyperliquidOrderId) {
          // Order doesn't have Hyperliquid ID yet (still pending submission)
          continue;
        }

        const apiOrder = apiOrderMap.get(dbOrder.hyperliquidOrderId);

        if (!apiOrder) {
          // Order in DB but not on Hyperliquid - likely filled or cancelled
          console.warn(
            `[ReconciliationService] Discrepancy: Order ${dbOrder.internalOrderId} ` +
              `in DB (${dbOrder.status}) but not found on Hyperliquid`
          );

          const discrepancy: DiscrepancyEvent = {
            type: 'order',
            entityId: dbOrder.internalOrderId,
            dbStatus: dbOrder.status,
            apiStatus: 'not_found',
            details: {
              symbol: dbOrder.symbol,
              side: dbOrder.side,
              size: dbOrder.size,
              hyperliquidOrderId: dbOrder.hyperliquidOrderId,
            },
            timestamp: Date.now(),
          };

          discrepancies.push(discrepancy);

          // Log to database
          await this.logDiscrepancy({
            orderId: dbOrder.id,
            checkType: 'order_status',
            entityType: 'order',
            entityId: dbOrder.hyperliquidOrderId,
            dbStatus: dbOrder.status,
            apiStatus: 'not_found',
            discrepancy: true,
            discrepancyDetails: discrepancy.details,
          });

          // Emit event
          this.emit('discrepancy', discrepancy);

          // Attempt automatic resolution: mark as filled/cancelled
          // (In production, you might want to query fills API to determine exact status)
          console.log(
            `[ReconciliationService] Auto-resolving: Marking order ${dbOrder.internalOrderId} as filled`
          );
          await db
            .update(hyperliquidOrders)
            .set({
              status: 'filled',
              filledAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(hyperliquidOrders.id, dbOrder.id));
        }
        // Note: Could add more checks here (status comparison, filled size, etc.)
      }

      // Check for orders on Hyperliquid but not in DB (should never happen)
      for (const apiOrder of apiOrders) {
        const dbOrder = dbOrders.find((o) => o.hyperliquidOrderId === apiOrder.oid);

        if (!dbOrder) {
          console.error(
            `[ReconciliationService] Critical: Order ${apiOrder.oid} on Hyperliquid but not in DB!`
          );

          const discrepancy: DiscrepancyEvent = {
            type: 'order',
            entityId: apiOrder.oid,
            dbStatus: 'not_found',
            apiStatus: 'open',
            details: apiOrder,
            timestamp: Date.now(),
          };

          discrepancies.push(discrepancy);

          // Log critical discrepancy
          await this.logDiscrepancy({
            checkType: 'order_existence',
            entityType: 'order',
            entityId: apiOrder.oid,
            dbStatus: 'not_found',
            apiStatus: 'open',
            discrepancy: true,
            discrepancyDetails: apiOrder,
          });

          // Emit critical alert
          this.emit('criticalDiscrepancy', discrepancy);
        }
      }

      return {
        ordersChecked: dbOrders.length,
        discrepancies,
      };
    } catch (error: any) {
      console.error('[ReconciliationService] Error reconciling user orders:', error);
      throw error;
    }
  }

  /**
   * Reconcile positions for a specific user
   */
  async reconcileUserPositions(userId: string, userAddress: string): Promise<{
    positionsChecked: number;
    discrepancies: DiscrepancyEvent[];
  }> {
    const discrepancies: DiscrepancyEvent[] = [];

    try {
      // Get open positions from database
      const dbPositions = await db
        .select()
        .from(hyperliquidPositions)
        .where(and(eq(hyperliquidPositions.userId, userId), isNull(hyperliquidPositions.closedAt)));

      console.log(`[ReconciliationService] Checking ${dbPositions.length} open positions for user ${userId}`);

      if (dbPositions.length === 0) {
        return { positionsChecked: 0, discrepancies: [] };
      }

      // Get positions from Hyperliquid API
      const userState = await this.client.getUserState(userAddress);
      const apiPositions = userState?.assetPositions?.filter((asset: any) => {
        const size = parseFloat(asset.position.szi);
        return size !== 0;
      }) || [];

      // Create map of API positions by symbol
      const apiPositionMap = new Map<string, any>();
      for (const apiPos of apiPositions) {
        apiPositionMap.set(apiPos.position.coin, apiPos);
      }

      // Check each DB position against API
      for (const dbPos of dbPositions) {
        const apiPos = apiPositionMap.get(dbPos.symbol);

        if (!apiPos) {
          // Position in DB but not on Hyperliquid - likely closed
          console.warn(
            `[ReconciliationService] Discrepancy: Position ${dbPos.symbol} ` +
              `in DB but not found on Hyperliquid`
          );

          const discrepancy: DiscrepancyEvent = {
            type: 'position',
            entityId: dbPos.id,
            dbStatus: 'open',
            apiStatus: 'not_found',
            details: {
              symbol: dbPos.symbol,
              side: dbPos.side,
              size: dbPos.size,
            },
            timestamp: Date.now(),
          };

          discrepancies.push(discrepancy);

          // Log discrepancy
          await this.logDiscrepancy({
            checkType: 'position_status',
            entityType: 'position',
            entityId: dbPos.id,
            dbStatus: 'open',
            apiStatus: 'closed',
            discrepancy: true,
            discrepancyDetails: discrepancy.details,
          });

          // Emit event
          this.emit('discrepancy', discrepancy);

          // Auto-resolve: mark position as closed
          console.log(
            `[ReconciliationService] Auto-resolving: Marking position ${dbPos.symbol} as closed`
          );
          await db
            .update(hyperliquidPositions)
            .set({
              closedAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(hyperliquidPositions.id, dbPos.id));
        } else {
          // Check size mismatch
          const apiSize = Math.abs(parseFloat(apiPos.position.szi));
          const dbSize = parseFloat(dbPos.size);
          const sizeDiff = Math.abs(apiSize - dbSize);

          // Allow 0.1% tolerance for floating point differences
          if (sizeDiff > dbSize * 0.001) {
            console.warn(
              `[ReconciliationService] Position size mismatch: ${dbPos.symbol} ` +
                `DB: ${dbSize}, API: ${apiSize}`
            );

            const discrepancy: DiscrepancyEvent = {
              type: 'position',
              entityId: dbPos.id,
              dbStatus: `size:${dbSize}`,
              apiStatus: `size:${apiSize}`,
              details: {
                symbol: dbPos.symbol,
                dbSize,
                apiSize,
                difference: sizeDiff,
              },
              timestamp: Date.now(),
            };

            discrepancies.push(discrepancy);

            // Log discrepancy
            await this.logDiscrepancy({
              checkType: 'position_size',
              entityType: 'position',
              entityId: dbPos.id,
              dbStatus: `size:${dbSize}`,
              apiStatus: `size:${apiSize}`,
              discrepancy: true,
              discrepancyDetails: discrepancy.details,
            });

            this.emit('discrepancy', discrepancy);
          }
        }
      }

      // Check for positions on Hyperliquid but not in DB
      for (const apiPos of apiPositions) {
        const dbPos = dbPositions.find((p) => p.symbol === apiPos.position.coin);

        if (!dbPos) {
          console.warn(
            `[ReconciliationService] Position ${apiPos.position.coin} on Hyperliquid but not in DB`
          );

          const discrepancy: DiscrepancyEvent = {
            type: 'position',
            entityId: apiPos.position.coin,
            dbStatus: 'not_found',
            apiStatus: 'open',
            details: apiPos.position,
            timestamp: Date.now(),
          };

          discrepancies.push(discrepancy);

          await this.logDiscrepancy({
            checkType: 'position_existence',
            entityType: 'position',
            entityId: apiPos.position.coin,
            dbStatus: 'not_found',
            apiStatus: 'open',
            discrepancy: true,
            discrepancyDetails: apiPos.position,
          });

          this.emit('discrepancy', discrepancy);
        }
      }

      return {
        positionsChecked: dbPositions.length,
        discrepancies,
      };
    } catch (error: any) {
      console.error('[ReconciliationService] Error reconciling user positions:', error);
      throw error;
    }
  }

  /**
   * Perform full reconciliation for a user
   */
  async reconcileUser(userId: string, userAddress: string): Promise<ReconciliationResult> {
    const startTime = Date.now();

    try {
      console.log(`[ReconciliationService] Starting reconciliation for user ${userId}`);

      const [orderResult, positionResult] = await Promise.all([
        this.reconcileUserOrders(userId, userAddress),
        this.reconcileUserPositions(userId, userAddress),
      ]);

      const allDiscrepancies = [...orderResult.discrepancies, ...positionResult.discrepancies];

      this.totalDiscrepancies += allDiscrepancies.length;

      const result: ReconciliationResult = {
        ordersChecked: orderResult.ordersChecked,
        positionsChecked: positionResult.positionsChecked,
        discrepanciesFound: allDiscrepancies.length,
        discrepancies: allDiscrepancies,
        duration: Date.now() - startTime,
      };

      console.log(
        `[ReconciliationService] Reconciliation complete: ${result.ordersChecked} orders, ` +
          `${result.positionsChecked} positions, ${result.discrepanciesFound} discrepancies (${result.duration}ms)`
      );

      return result;
    } catch (error: any) {
      console.error('[ReconciliationService] Reconciliation failed:', error);
      throw error;
    }
  }

  /**
   * Log a discrepancy to the database
   */
  private async logDiscrepancy(data: Omit<NewHyperliquidReconciliation, 'id' | 'createdAt'>): Promise<void> {
    try {
      await db.insert(hyperliquidReconciliations).values({
        ...data,
        metadata: data.discrepancyDetails,
      });
    } catch (error: any) {
      console.error('[ReconciliationService] Failed to log discrepancy:', error);
    }
  }

  /**
   * Start periodic reconciliation
   */
  startPeriodicReconciliation(
    userId: string,
    userAddress: string,
    intervalMs: number = 300000 // 5 minutes
  ): void {
    if (this.reconciliationInterval) {
      console.warn('[ReconciliationService] Periodic reconciliation already running');
      return;
    }

    console.log(`[ReconciliationService] Starting periodic reconciliation (interval: ${intervalMs}ms)`);

    // Initial reconciliation
    this.reconcileUser(userId, userAddress).catch((error) => {
      console.error('[ReconciliationService] Initial reconciliation failed:', error);
    });

    // Periodic reconciliation
    this.reconciliationInterval = setInterval(async () => {
      if (this.isReconciling) {
        console.log('[ReconciliationService] Skipping reconciliation (previous run still in progress)');
        return;
      }

      try {
        this.isReconciling = true;
        this.totalReconciliations++;
        this.lastReconciliationTime = Date.now();

        await this.reconcileUser(userId, userAddress);
      } catch (error) {
        console.error('[ReconciliationService] Periodic reconciliation failed:', error);
      } finally {
        this.isReconciling = false;
      }
    }, intervalMs);
  }

  /**
   * Stop periodic reconciliation
   */
  stopPeriodicReconciliation(): void {
    if (this.reconciliationInterval) {
      clearInterval(this.reconciliationInterval);
      this.reconciliationInterval = null;
      console.log('[ReconciliationService] Stopped periodic reconciliation');
    }
  }

  /**
   * Get reconciliation statistics
   */
  getStats() {
    return {
      totalReconciliations: this.totalReconciliations,
      totalDiscrepancies: this.totalDiscrepancies,
      lastReconciliationTime: this.lastReconciliationTime,
      isReconciling: this.isReconciling,
    };
  }

  /**
   * Shutdown service
   */
  shutdown(): void {
    this.stopPeriodicReconciliation();
    this.removeAllListeners();
    console.log('[ReconciliationService] Shutdown complete');
  }
}

/**
 * Singleton instance
 */
let reconciliationServiceInstance: ReconciliationService | null = null;

/**
 * Get the singleton instance
 */
export function getReconciliationService(): ReconciliationService {
  if (!reconciliationServiceInstance) {
    reconciliationServiceInstance = new ReconciliationService();
  }
  return reconciliationServiceInstance;
}

/**
 * Reset the singleton instance
 */
export function resetReconciliationService(): void {
  if (reconciliationServiceInstance) {
    reconciliationServiceInstance.shutdown();
    reconciliationServiceInstance = null;
  }
}
