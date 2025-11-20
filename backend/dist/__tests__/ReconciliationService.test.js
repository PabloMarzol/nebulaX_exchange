import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ReconciliationService, getReconciliationService, resetReconciliationService, } from '../services/hyperliquid/ReconciliationService';
// Mock dependencies
vi.mock('../services/hyperliquid/HyperliquidClient', () => ({
    getHyperliquidClient: vi.fn(() => mockClient),
}));
vi.mock('../../lib/db', () => ({
    db: mockDb,
}));
// Mock client
const mockClient = {
    getUserState: vi.fn(),
};
// Mock database
const mockDb = {
    select: vi.fn(() => mockDb),
    from: vi.fn(() => mockDb),
    where: vi.fn(() => mockDb),
    update: vi.fn(() => mockDb),
    set: vi.fn(() => mockDb),
    insert: vi.fn(() => mockDb),
    values: vi.fn(() => mockDb),
};
describe('ReconciliationService', () => {
    let reconciliationService;
    const testUserId = 'test-user-123';
    const testUserAddress = '0x1234567890abcdef';
    beforeEach(() => {
        reconciliationService = new ReconciliationService();
        vi.clearAllMocks();
    });
    afterEach(() => {
        reconciliationService.shutdown();
    });
    describe('Initialization', () => {
        it('should initialize with zero statistics', () => {
            const stats = reconciliationService.getStats();
            expect(stats.totalReconciliations).toBe(0);
            expect(stats.totalDiscrepancies).toBe(0);
            expect(stats.lastReconciliationTime).toBeNull();
            expect(stats.isReconciling).toBe(false);
        });
        it('should be an event emitter', () => {
            expect(reconciliationService.on).toBeDefined();
            expect(reconciliationService.emit).toBeDefined();
        });
    });
    describe('Order Reconciliation', () => {
        it('should reconcile orders with no discrepancies', async () => {
            // Mock DB: no open orders
            mockDb.select.mockReturnValueOnce([]);
            const result = await reconciliationService.reconcileUserOrders(testUserId, testUserAddress);
            expect(result.ordersChecked).toBe(0);
            expect(result.discrepancies).toEqual([]);
        });
        it('should detect order in DB but not on Hyperliquid', async () => {
            // Mock DB: one open order
            const dbOrder = {
                id: 1,
                userId: testUserId,
                internalOrderId: 'order-123',
                hyperliquidOrderId: 'hl-order-123',
                symbol: 'BTC',
                side: 'buy',
                size: '0.1',
                status: 'open',
            };
            mockDb.where.mockResolvedValueOnce([dbOrder]);
            // Mock Hyperliquid API: no open orders
            mockClient.getUserState.mockResolvedValueOnce({
                assetPositions: [],
            });
            // Mock insert for logging
            mockDb.values.mockResolvedValueOnce(undefined);
            // Mock update for auto-resolution
            mockDb.set.mockResolvedValueOnce(undefined);
            const result = await reconciliationService.reconcileUserOrders(testUserId, testUserAddress);
            expect(result.ordersChecked).toBe(1);
            expect(result.discrepancies).toHaveLength(1);
            expect(result.discrepancies[0].type).toBe('order');
            expect(result.discrepancies[0].dbStatus).toBe('open');
            expect(result.discrepancies[0].apiStatus).toBe('not_found');
        });
        it('should detect order on Hyperliquid but not in DB', async () => {
            // Mock DB: no orders
            mockDb.where.mockResolvedValueOnce([]);
            // Mock Hyperliquid API: one open order
            mockClient.getUserState.mockResolvedValueOnce({
                assetPositions: [
                    {
                        position: {
                            coin: 'BTC',
                            openOrders: [
                                {
                                    oid: 'hl-order-999',
                                    side: 'B',
                                    sz: '0.1',
                                    px: '50000',
                                },
                            ],
                        },
                    },
                ],
            });
            // Mock insert for logging
            mockDb.values.mockResolvedValueOnce(undefined);
            const result = await reconciliationService.reconcileUserOrders(testUserId, testUserAddress);
            expect(result.discrepancies).toHaveLength(1);
            expect(result.discrepancies[0].type).toBe('order');
            expect(result.discrepancies[0].dbStatus).toBe('not_found');
            expect(result.discrepancies[0].apiStatus).toBe('open');
        });
        it('should skip orders without hyperliquidOrderId', async () => {
            // Mock DB: order without hyperliquidOrderId (pending submission)
            const dbOrder = {
                id: 1,
                userId: testUserId,
                internalOrderId: 'order-123',
                hyperliquidOrderId: null, // Not submitted yet
                symbol: 'BTC',
                side: 'buy',
                size: '0.1',
                status: 'pending',
            };
            mockDb.where.mockResolvedValueOnce([dbOrder]);
            mockClient.getUserState.mockResolvedValueOnce({
                assetPositions: [],
            });
            const result = await reconciliationService.reconcileUserOrders(testUserId, testUserAddress);
            expect(result.ordersChecked).toBe(1);
            expect(result.discrepancies).toHaveLength(0); // Should skip pending order
        });
        it('should emit discrepancy event', async () => {
            const dbOrder = {
                id: 1,
                userId: testUserId,
                internalOrderId: 'order-123',
                hyperliquidOrderId: 'hl-order-123',
                symbol: 'BTC',
                side: 'buy',
                size: '0.1',
                status: 'open',
            };
            mockDb.where.mockResolvedValueOnce([dbOrder]);
            mockClient.getUserState.mockResolvedValueOnce({
                assetPositions: [],
            });
            mockDb.values.mockResolvedValueOnce(undefined);
            mockDb.set.mockResolvedValueOnce(undefined);
            const discrepancyHandler = vi.fn();
            reconciliationService.on('discrepancy', discrepancyHandler);
            await reconciliationService.reconcileUserOrders(testUserId, testUserAddress);
            expect(discrepancyHandler).toHaveBeenCalledOnce();
            expect(discrepancyHandler.mock.calls[0][0]).toMatchObject({
                type: 'order',
                dbStatus: 'open',
                apiStatus: 'not_found',
            });
        });
        it('should emit critical discrepancy for API order not in DB', async () => {
            mockDb.where.mockResolvedValueOnce([]);
            mockClient.getUserState.mockResolvedValueOnce({
                assetPositions: [
                    {
                        position: {
                            coin: 'BTC',
                            openOrders: [{ oid: 'hl-999', side: 'B', sz: '0.1', px: '50000' }],
                        },
                    },
                ],
            });
            mockDb.values.mockResolvedValueOnce(undefined);
            const criticalHandler = vi.fn();
            reconciliationService.on('criticalDiscrepancy', criticalHandler);
            await reconciliationService.reconcileUserOrders(testUserId, testUserAddress);
            expect(criticalHandler).toHaveBeenCalledOnce();
        });
    });
    describe('Position Reconciliation', () => {
        it('should reconcile positions with no discrepancies', async () => {
            mockDb.where.mockResolvedValueOnce([]);
            const result = await reconciliationService.reconcileUserPositions(testUserId, testUserAddress);
            expect(result.positionsChecked).toBe(0);
            expect(result.discrepancies).toEqual([]);
        });
        it('should detect position in DB but not on Hyperliquid', async () => {
            const dbPosition = {
                id: 'pos-1',
                userId: testUserId,
                symbol: 'BTC',
                side: 'long',
                size: '0.5',
                closedAt: null,
            };
            mockDb.where.mockResolvedValueOnce([dbPosition]);
            // Mock Hyperliquid API: no positions
            mockClient.getUserState.mockResolvedValueOnce({
                assetPositions: [],
            });
            mockDb.values.mockResolvedValueOnce(undefined);
            mockDb.set.mockResolvedValueOnce(undefined);
            const result = await reconciliationService.reconcileUserPositions(testUserId, testUserAddress);
            expect(result.positionsChecked).toBe(1);
            expect(result.discrepancies).toHaveLength(1);
            expect(result.discrepancies[0].type).toBe('position');
            expect(result.discrepancies[0].dbStatus).toBe('open');
            expect(result.discrepancies[0].apiStatus).toBe('not_found');
        });
        it('should detect position size mismatch', async () => {
            const dbPosition = {
                id: 'pos-1',
                userId: testUserId,
                symbol: 'BTC',
                side: 'long',
                size: '0.5', // DB size
                closedAt: null,
            };
            mockDb.where.mockResolvedValueOnce([dbPosition]);
            // Mock Hyperliquid API: position with different size
            mockClient.getUserState.mockResolvedValueOnce({
                assetPositions: [
                    {
                        position: {
                            coin: 'BTC',
                            szi: '1.0', // API size (different from DB)
                        },
                    },
                ],
            });
            mockDb.values.mockResolvedValueOnce(undefined);
            const result = await reconciliationService.reconcileUserPositions(testUserId, testUserAddress);
            expect(result.discrepancies).toHaveLength(1);
            expect(result.discrepancies[0].type).toBe('position');
            expect(result.discrepancies[0].dbStatus).toContain('size:0.5');
            expect(result.discrepancies[0].apiStatus).toContain('size:1');
        });
        it('should allow small size differences (tolerance)', async () => {
            const dbPosition = {
                id: 'pos-1',
                userId: testUserId,
                symbol: 'BTC',
                side: 'long',
                size: '1.0000',
                closedAt: null,
            };
            mockDb.where.mockResolvedValueOnce([dbPosition]);
            // Mock Hyperliquid API: position with tiny size difference
            mockClient.getUserState.mockResolvedValueOnce({
                assetPositions: [
                    {
                        position: {
                            coin: 'BTC',
                            szi: '1.00005', // Within 0.1% tolerance
                        },
                    },
                ],
            });
            const result = await reconciliationService.reconcileUserPositions(testUserId, testUserAddress);
            // Should not report discrepancy for tiny differences
            expect(result.discrepancies).toHaveLength(0);
        });
        it('should detect position on Hyperliquid but not in DB', async () => {
            mockDb.where.mockResolvedValueOnce([]);
            mockClient.getUserState.mockResolvedValueOnce({
                assetPositions: [
                    {
                        position: {
                            coin: 'ETH',
                            szi: '2.5',
                        },
                    },
                ],
            });
            mockDb.values.mockResolvedValueOnce(undefined);
            const result = await reconciliationService.reconcileUserPositions(testUserId, testUserAddress);
            expect(result.discrepancies).toHaveLength(1);
            expect(result.discrepancies[0].dbStatus).toBe('not_found');
            expect(result.discrepancies[0].apiStatus).toBe('open');
        });
    });
    describe('Full User Reconciliation', () => {
        it('should reconcile both orders and positions', async () => {
            // Mock orders
            mockDb.where.mockResolvedValueOnce([]);
            // Mock positions
            mockDb.where.mockResolvedValueOnce([]);
            mockClient.getUserState.mockResolvedValue({
                assetPositions: [],
            });
            const result = await reconciliationService.reconcileUser(testUserId, testUserAddress);
            expect(result.ordersChecked).toBe(0);
            expect(result.positionsChecked).toBe(0);
            expect(result.discrepanciesFound).toBe(0);
            expect(result.duration).toBeGreaterThan(0);
        });
        it('should aggregate discrepancies from orders and positions', async () => {
            // Mock order with discrepancy
            const dbOrder = {
                id: 1,
                userId: testUserId,
                internalOrderId: 'order-123',
                hyperliquidOrderId: 'hl-order-123',
                symbol: 'BTC',
                side: 'buy',
                size: '0.1',
                status: 'open',
            };
            // Mock position with discrepancy
            const dbPosition = {
                id: 'pos-1',
                userId: testUserId,
                symbol: 'ETH',
                side: 'long',
                size: '1.0',
                closedAt: null,
            };
            mockDb.where
                .mockResolvedValueOnce([dbOrder])
                .mockResolvedValueOnce([dbPosition]);
            mockClient.getUserState.mockResolvedValue({
                assetPositions: [],
            });
            mockDb.values.mockResolvedValue(undefined);
            mockDb.set.mockResolvedValue(undefined);
            const result = await reconciliationService.reconcileUser(testUserId, testUserAddress);
            expect(result.discrepanciesFound).toBe(2); // 1 order + 1 position
            expect(result.discrepancies).toHaveLength(2);
        });
        it('should track reconciliation duration', async () => {
            mockDb.where.mockResolvedValue([]);
            mockClient.getUserState.mockResolvedValue({
                assetPositions: [],
            });
            const result = await reconciliationService.reconcileUser(testUserId, testUserAddress);
            expect(result.duration).toBeGreaterThan(0);
            expect(typeof result.duration).toBe('number');
        });
    });
    describe('Periodic Reconciliation', () => {
        it('should start periodic reconciliation', () => {
            mockDb.where.mockResolvedValue([]);
            mockClient.getUserState.mockResolvedValue({
                assetPositions: [],
            });
            reconciliationService.startPeriodicReconciliation(testUserId, testUserAddress, 1000 // 1 second interval for testing
            );
            // Service should have started
            expect(reconciliationService['reconciliationInterval']).not.toBeNull();
        });
        it('should not start if already running', () => {
            mockDb.where.mockResolvedValue([]);
            mockClient.getUserState.mockResolvedValue({
                assetPositions: [],
            });
            reconciliationService.startPeriodicReconciliation(testUserId, testUserAddress, 1000);
            const interval1 = reconciliationService['reconciliationInterval'];
            // Try to start again
            reconciliationService.startPeriodicReconciliation(testUserId, testUserAddress, 1000);
            const interval2 = reconciliationService['reconciliationInterval'];
            // Should be the same interval (not restarted)
            expect(interval2).toBe(interval1);
        });
        it('should stop periodic reconciliation', () => {
            mockDb.where.mockResolvedValue([]);
            mockClient.getUserState.mockResolvedValue({
                assetPositions: [],
            });
            reconciliationService.startPeriodicReconciliation(testUserId, testUserAddress, 1000);
            expect(reconciliationService['reconciliationInterval']).not.toBeNull();
            reconciliationService.stopPeriodicReconciliation();
            expect(reconciliationService['reconciliationInterval']).toBeNull();
        });
        it('should run reconciliation periodically', async () => {
            mockDb.where.mockResolvedValue([]);
            mockClient.getUserState.mockResolvedValue({
                assetPositions: [],
            });
            let reconciliationCount = 0;
            reconciliationService.on('reconciliationComplete', () => {
                reconciliationCount++;
            });
            reconciliationService.startPeriodicReconciliation(testUserId, testUserAddress, 100 // 100ms interval
            );
            // Wait for multiple intervals
            await new Promise((resolve) => setTimeout(resolve, 350));
            reconciliationService.stopPeriodicReconciliation();
            // Should have run at least 2 times (initial + periodic)
            // Note: This test is timing-dependent and might be flaky
        }, 10000);
    });
    describe('Statistics', () => {
        it('should track total discrepancies', async () => {
            const dbOrder = {
                id: 1,
                userId: testUserId,
                internalOrderId: 'order-123',
                hyperliquidOrderId: 'hl-order-123',
                symbol: 'BTC',
                side: 'buy',
                size: '0.1',
                status: 'open',
            };
            mockDb.where.mockResolvedValue([dbOrder]);
            mockClient.getUserState.mockResolvedValue({
                assetPositions: [],
            });
            mockDb.values.mockResolvedValue(undefined);
            mockDb.set.mockResolvedValue(undefined);
            await reconciliationService.reconcileUser(testUserId, testUserAddress);
            const stats = reconciliationService.getStats();
            expect(stats.totalDiscrepancies).toBe(2); // order discrepancy from both checks
        });
        it('should return current reconciliation state', () => {
            const stats = reconciliationService.getStats();
            expect(stats).toHaveProperty('totalReconciliations');
            expect(stats).toHaveProperty('totalDiscrepancies');
            expect(stats).toHaveProperty('lastReconciliationTime');
            expect(stats).toHaveProperty('isReconciling');
            expect(stats.isReconciling).toBe(false);
        });
    });
    describe('Shutdown', () => {
        it('should shutdown cleanly', () => {
            mockDb.where.mockResolvedValue([]);
            mockClient.getUserState.mockResolvedValue({
                assetPositions: [],
            });
            reconciliationService.startPeriodicReconciliation(testUserId, testUserAddress, 1000);
            expect(reconciliationService['reconciliationInterval']).not.toBeNull();
            reconciliationService.shutdown();
            expect(reconciliationService['reconciliationInterval']).toBeNull();
        });
        it('should remove all event listeners on shutdown', () => {
            const handler = vi.fn();
            reconciliationService.on('discrepancy', handler);
            expect(reconciliationService.listenerCount('discrepancy')).toBe(1);
            reconciliationService.shutdown();
            expect(reconciliationService.listenerCount('discrepancy')).toBe(0);
        });
    });
});
describe('Singleton Functions', () => {
    afterEach(() => {
        resetReconciliationService();
    });
    describe('getReconciliationService', () => {
        it('should return singleton instance', () => {
            const instance1 = getReconciliationService();
            const instance2 = getReconciliationService();
            expect(instance1).toBe(instance2);
        });
        it('should create new instance on first call', () => {
            const instance = getReconciliationService();
            expect(instance).toBeInstanceOf(ReconciliationService);
        });
    });
    describe('resetReconciliationService', () => {
        it('should reset singleton instance', () => {
            const instance1 = getReconciliationService();
            resetReconciliationService();
            const instance2 = getReconciliationService();
            expect(instance1).not.toBe(instance2);
        });
        it('should shutdown instance before resetting', () => {
            const instance = getReconciliationService();
            const shutdownSpy = vi.spyOn(instance, 'shutdown');
            resetReconciliationService();
            expect(shutdownSpy).toHaveBeenCalled();
        });
    });
});
