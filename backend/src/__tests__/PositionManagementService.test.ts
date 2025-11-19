import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  PositionManagementService,
  getPositionManagementService,
  resetPositionManagementService,
} from '../services/hyperliquid/PositionManagementService';

// Mock dependencies
vi.mock('../services/hyperliquid/HyperliquidClient', () => ({
  getHyperliquidClient: vi.fn(() => mockClient),
}));

vi.mock('../services/hyperliquid/OrderExecutionService', () => ({
  getOrderExecutionService: vi.fn(() => mockOrderService),
}));

vi.mock('../../lib/db', () => ({
  db: mockDb,
}));

// Mock client
const mockClient = {
  getUserState: vi.fn(),
  getAllMids: vi.fn(),
};

// Mock order service
const mockOrderService = {
  placeOrder: vi.fn(),
};

// Mock database
const mockDb = {
  select: vi.fn(() => mockDb),
  from: vi.fn(() => mockDb),
  where: vi.fn(() => mockDb),
  limit: vi.fn(() => mockDb),
  update: vi.fn(() => mockDb),
  set: vi.fn(() => mockDb),
  insert: vi.fn(() => mockDb),
  values: vi.fn(() => mockDb),
  returning: vi.fn(() => mockDb),
};

describe('PositionManagementService', () => {
  let positionService: PositionManagementService;
  const testUserId = 'user-123';
  const testUserAddress = '0x1234567890123456789012345678901234567890';

  beforeEach(() => {
    positionService = new PositionManagementService();
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await positionService.shutdown();
  });

  describe('Initialization', () => {
    it('should initialize successfully', () => {
      expect(positionService).toBeInstanceOf(PositionManagementService);
    });

    it('should be an event emitter', () => {
      expect(positionService.on).toBeDefined();
      expect(positionService.emit).toBeDefined();
    });
  });

  describe('Get User Positions', () => {
    it('should fetch positions from Hyperliquid API', async () => {
      const mockUserState = {
        assetPositions: [
          {
            position: {
              coin: 'BTC',
              szi: '0.5',
              entryPx: '50000',
              positionValue: '25000',
              unrealizedPnl: '1000',
              leverage: { value: '10' },
              liquidationPx: '45000',
              marginUsed: '2500',
            },
          },
        ],
      };

      mockClient.getUserState.mockResolvedValueOnce(mockUserState);

      const positions = await positionService.getUserPositions(testUserAddress);

      expect(positions).toHaveLength(1);
      expect(positions[0].position.coin).toBe('BTC');
      expect(mockClient.getUserState).toHaveBeenCalledWith(testUserAddress);
    });

    it('should return empty array when no positions exist', async () => {
      mockClient.getUserState.mockResolvedValueOnce({
        assetPositions: [],
      });

      const positions = await positionService.getUserPositions(testUserAddress);

      expect(positions).toEqual([]);
    });

    it('should filter out zero-size positions', async () => {
      const mockUserState = {
        assetPositions: [
          {
            position: {
              coin: 'BTC',
              szi: '0.5',
              entryPx: '50000',
            },
          },
          {
            position: {
              coin: 'ETH',
              szi: '0', // Zero size - should be filtered out
              entryPx: '3000',
            },
          },
        ],
      };

      mockClient.getUserState.mockResolvedValueOnce(mockUserState);

      const positions = await positionService.getUserPositions(testUserAddress);

      expect(positions).toHaveLength(1);
      expect(positions[0].position.coin).toBe('BTC');
    });

    it('should handle API errors', async () => {
      mockClient.getUserState.mockRejectedValueOnce(new Error('API error'));

      await expect(
        positionService.getUserPositions(testUserAddress)
      ).rejects.toThrow('Failed to fetch positions');
    });
  });

  describe('P&L Calculations', () => {
    describe('Unrealized P&L', () => {
      it('should calculate long position P&L correctly', () => {
        const pnl = positionService.calculateUnrealizedPnl({
          side: 'long',
          size: 1.0,
          entryPrice: 50000,
          markPrice: 52000,
        });

        // Long: (52000 - 50000) * 1.0 = 2000
        expect(pnl).toBe(2000);
      });

      it('should calculate short position P&L correctly', () => {
        const pnl = positionService.calculateUnrealizedPnl({
          side: 'short',
          size: 1.0,
          entryPrice: 50000,
          markPrice: 48000,
        });

        // Short: (50000 - 48000) * 1.0 = 2000
        expect(pnl).toBe(2000);
      });

      it('should calculate negative P&L for losing long position', () => {
        const pnl = positionService.calculateUnrealizedPnl({
          side: 'long',
          size: 0.5,
          entryPrice: 50000,
          markPrice: 48000,
        });

        // Long: (48000 - 50000) * 0.5 = -1000
        expect(pnl).toBe(-1000);
      });

      it('should calculate negative P&L for losing short position', () => {
        const pnl = positionService.calculateUnrealizedPnl({
          side: 'short',
          size: 0.5,
          entryPrice: 50000,
          markPrice: 52000,
        });

        // Short: (50000 - 52000) * 0.5 = -1000
        expect(pnl).toBe(-1000);
      });

      it('should handle zero P&L when price unchanged', () => {
        const pnl = positionService.calculateUnrealizedPnl({
          side: 'long',
          size: 1.0,
          entryPrice: 50000,
          markPrice: 50000,
        });

        expect(pnl).toBe(0);
      });
    });

    describe('Liquidation Price', () => {
      it('should calculate liquidation price for long position', () => {
        const liqPrice = positionService.calculateLiquidationPrice({
          side: 'long',
          entryPrice: 50000,
          leverage: 10,
          maintenanceMarginRate: 0.03,
        });

        // Long: 50000 * (1 - (1/10) + 0.03) = 50000 * 0.93 = 46500
        expect(liqPrice).toBeCloseTo(46500, 0);
      });

      it('should calculate liquidation price for short position', () => {
        const liqPrice = positionService.calculateLiquidationPrice({
          side: 'short',
          entryPrice: 50000,
          leverage: 10,
          maintenanceMarginRate: 0.03,
        });

        // Short: 50000 * (1 + (1/10) - 0.03) = 50000 * 1.07 = 53500
        expect(liqPrice).toBeCloseTo(53500, 0);
      });

      it('should use default maintenance margin if not provided', () => {
        const liqPrice = positionService.calculateLiquidationPrice({
          side: 'long',
          entryPrice: 50000,
          leverage: 10,
        });

        // Should use default 0.03 (3%)
        expect(liqPrice).toBeCloseTo(46500, 0);
      });

      it('should not return negative liquidation price', () => {
        const liqPrice = positionService.calculateLiquidationPrice({
          side: 'long',
          entryPrice: 1000,
          leverage: 2, // High leverage
          maintenanceMarginRate: 0.6, // High maintenance margin
        });

        // Even if calculation would be negative, should return 0
        expect(liqPrice).toBeGreaterThanOrEqual(0);
      });

      it('should calculate correctly for different leverage levels', () => {
        const liqPrice5x = positionService.calculateLiquidationPrice({
          side: 'long',
          entryPrice: 50000,
          leverage: 5,
        });

        const liqPrice20x = positionService.calculateLiquidationPrice({
          side: 'long',
          entryPrice: 50000,
          leverage: 20,
        });

        // Higher leverage = closer liquidation price
        expect(liqPrice20x).toBeGreaterThan(liqPrice5x);
      });
    });

    describe('Margin Calculation', () => {
      it('should calculate margin used correctly', () => {
        const marginUsed = positionService.calculateMarginUsed({
          size: 1.0,
          entryPrice: 50000,
          leverage: 10,
        });

        // Position value: 1.0 * 50000 = 50000
        // Margin: 50000 / 10 = 5000
        expect(marginUsed).toBe(5000);
      });

      it('should calculate for different leverage levels', () => {
        const margin5x = positionService.calculateMarginUsed({
          size: 1.0,
          entryPrice: 50000,
          leverage: 5,
        });

        const margin20x = positionService.calculateMarginUsed({
          size: 1.0,
          entryPrice: 50000,
          leverage: 20,
        });

        // Lower leverage = more margin required
        expect(margin5x).toBeGreaterThan(margin20x);
        expect(margin5x).toBe(10000);
        expect(margin20x).toBe(2500);
      });
    });
  });

  describe('Position Synchronization', () => {
    it('should sync new position to database', async () => {
      const mockUserState = {
        assetPositions: [
          {
            position: {
              coin: 'BTC',
              szi: '0.5',
              entryPx: '50000',
              positionValue: '25000',
              unrealizedPnl: '1000',
              leverage: { value: '10' },
              liquidationPx: '45000',
              marginUsed: '2500',
            },
          },
        ],
      };

      mockClient.getUserState.mockResolvedValueOnce(mockUserState);
      mockClient.getAllMids.mockResolvedValueOnce({ BTC: '51000' });

      // No existing position
      mockDb.limit.mockResolvedValueOnce([]);

      // Mock insert
      mockDb.returning.mockResolvedValueOnce([{
        id: '1',
        userId: testUserId,
        symbol: 'BTC',
        side: 'long',
        size: '0.5',
      }]);

      // Mock query for closing positions
      mockDb.where.mockResolvedValueOnce([]);

      const positions = await positionService.syncUserPositions(testUserId, testUserAddress);

      expect(positions).toHaveLength(1);
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it('should update existing position', async () => {
      const mockUserState = {
        assetPositions: [
          {
            position: {
              coin: 'BTC',
              szi: '0.7', // Updated size
              entryPx: '50000',
              positionValue: '35000',
              unrealizedPnl: '1500',
              leverage: { value: '10' },
              liquidationPx: '45000',
              marginUsed: '3500',
            },
          },
        ],
      };

      mockClient.getUserState.mockResolvedValueOnce(mockUserState);
      mockClient.getAllMids.mockResolvedValueOnce({ BTC: '51000' });

      // Existing position
      mockDb.limit.mockResolvedValueOnce([{
        id: '1',
        userId: testUserId,
        symbol: 'BTC',
        side: 'long',
        size: '0.5',
      }]);

      // Mock update
      mockDb.returning.mockResolvedValueOnce([{
        id: '1',
        userId: testUserId,
        symbol: 'BTC',
        side: 'long',
        size: '0.7',
      }]);

      // Mock query for closing positions
      mockDb.where.mockResolvedValueOnce([]);

      const positions = await positionService.syncUserPositions(testUserId, testUserAddress);

      expect(positions).toHaveLength(1);
      expect(mockDb.update).toHaveBeenCalled();
    });

    it('should close positions that no longer exist on API', async () => {
      const mockUserState = {
        assetPositions: [], // No positions on API
      };

      mockClient.getUserState.mockResolvedValueOnce(mockUserState);
      mockClient.getAllMids.mockResolvedValueOnce({});

      // DB has an open position
      const dbPosition = {
        id: '1',
        userId: testUserId,
        symbol: 'BTC',
        side: 'long',
        size: '0.5',
        closedAt: null,
      };

      mockDb.where.mockResolvedValueOnce([dbPosition]);

      await positionService.syncUserPositions(testUserId, testUserAddress);

      // Should update position with closedAt
      expect(mockDb.update).toHaveBeenCalled();
    });

    it('should emit positionUpdate event for new positions', async () => {
      const mockUserState = {
        assetPositions: [
          {
            position: {
              coin: 'BTC',
              szi: '0.5',
              entryPx: '50000',
              positionValue: '25000',
              unrealizedPnl: '1000',
              leverage: { value: '10' },
              liquidationPx: '45000',
              marginUsed: '2500',
            },
          },
        ],
      };

      mockClient.getUserState.mockResolvedValueOnce(mockUserState);
      mockClient.getAllMids.mockResolvedValueOnce({ BTC: '51000' });
      mockDb.limit.mockResolvedValueOnce([]);
      mockDb.returning.mockResolvedValueOnce([{ id: '1' }]);
      mockDb.where.mockResolvedValueOnce([]);

      const updateHandler = vi.fn();
      positionService.on('positionUpdate', updateHandler);

      await positionService.syncUserPositions(testUserId, testUserAddress);

      expect(updateHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: testUserId,
          symbol: 'BTC',
          side: 'long',
        })
      );
    });

    it('should emit positionClosed event when position is closed', async () => {
      const mockUserState = {
        assetPositions: [],
      };

      mockClient.getUserState.mockResolvedValueOnce(mockUserState);
      mockClient.getAllMids.mockResolvedValueOnce({});

      const dbPosition = {
        id: '1',
        userId: testUserId,
        symbol: 'BTC',
        side: 'long',
        closedAt: null,
        markPrice: '51000',
        realizedPnl: '1000',
      };

      mockDb.where.mockResolvedValueOnce([dbPosition]);

      const closedHandler = vi.fn();
      positionService.on('positionClosed', closedHandler);

      await positionService.syncUserPositions(testUserId, testUserAddress);

      expect(closedHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: testUserId,
          symbol: 'BTC',
          side: 'long',
        })
      );
    });

    it('should handle short positions correctly', async () => {
      const mockUserState = {
        assetPositions: [
          {
            position: {
              coin: 'BTC',
              szi: '-0.5', // Negative = short
              entryPx: '50000',
              positionValue: '25000',
              unrealizedPnl: '-500',
              leverage: { value: '10' },
              liquidationPx: '55000',
              marginUsed: '2500',
            },
          },
        ],
      };

      mockClient.getUserState.mockResolvedValueOnce(mockUserState);
      mockClient.getAllMids.mockResolvedValueOnce({ BTC: '51000' });
      mockDb.limit.mockResolvedValueOnce([]);
      mockDb.returning.mockResolvedValueOnce([{
        id: '1',
        side: 'short',
        size: '0.5',
      }]);
      mockDb.where.mockResolvedValueOnce([]);

      const positions = await positionService.syncUserPositions(testUserId, testUserAddress);

      expect(positions[0].side).toBe('short');
      expect(positions[0].size).toBe('0.5');
    });
  });

  describe('Database Operations', () => {
    it('should get positions from database', async () => {
      const mockPositions = [
        { id: '1', symbol: 'BTC', closedAt: null },
        { id: '2', symbol: 'ETH', closedAt: null },
      ];

      mockDb.where.mockResolvedValueOnce(mockPositions);

      const positions = await positionService.getUserPositionsFromDb(testUserId);

      expect(positions).toEqual(mockPositions);
    });

    it('should exclude closed positions by default', async () => {
      const mockPositions = [
        { id: '1', symbol: 'BTC', closedAt: null },
      ];

      mockDb.where.mockResolvedValueOnce(mockPositions);

      await positionService.getUserPositionsFromDb(testUserId, false);

      // Should filter for null closedAt
      expect(mockDb.where).toHaveBeenCalled();
    });

    it('should get position by symbol', async () => {
      const mockPosition = {
        id: '1',
        userId: testUserId,
        symbol: 'BTC',
        closedAt: null,
      };

      mockDb.limit.mockResolvedValueOnce([mockPosition]);

      const position = await positionService.getPositionBySymbol(testUserId, 'BTC');

      expect(position).toEqual(mockPosition);
    });

    it('should return null if position not found', async () => {
      mockDb.limit.mockResolvedValueOnce([]);

      const position = await positionService.getPositionBySymbol(testUserId, 'UNKNOWN');

      expect(position).toBeNull();
    });
  });

  describe('Close Position', () => {
    it('should close long position with market order', async () => {
      const mockPosition = {
        id: '1',
        userId: testUserId,
        symbol: 'BTC',
        side: 'long',
        size: '0.5',
        closedAt: null,
      };

      mockDb.limit.mockResolvedValueOnce([mockPosition]);
      mockClient.getAllMids.mockResolvedValueOnce({ BTC: '51000' });

      mockOrderService.placeOrder.mockResolvedValueOnce({
        success: true,
        internalOrderId: 'order-123',
      });

      const result = await positionService.closePosition({
        userId: testUserId,
        userAddress: testUserAddress,
        symbol: 'BTC',
        orderType: 'market',
      });

      expect(result.success).toBe(true);
      expect(result.orderId).toBe('order-123');
      expect(mockOrderService.placeOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          side: 'sell', // Opposite of long
          size: 0.5,
          reduceOnly: true,
        })
      );
    });

    it('should close short position with market order', async () => {
      const mockPosition = {
        id: '1',
        userId: testUserId,
        symbol: 'BTC',
        side: 'short',
        size: '0.5',
        closedAt: null,
      };

      mockDb.limit.mockResolvedValueOnce([mockPosition]);
      mockClient.getAllMids.mockResolvedValueOnce({ BTC: '51000' });

      mockOrderService.placeOrder.mockResolvedValueOnce({
        success: true,
        internalOrderId: 'order-123',
      });

      const result = await positionService.closePosition({
        userId: testUserId,
        userAddress: testUserAddress,
        symbol: 'BTC',
        orderType: 'market',
      });

      expect(mockOrderService.placeOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          side: 'buy', // Opposite of short
          reduceOnly: true,
        })
      );
    });

    it('should close position with limit order', async () => {
      const mockPosition = {
        id: '1',
        userId: testUserId,
        symbol: 'BTC',
        side: 'long',
        size: '0.5',
        closedAt: null,
      };

      mockDb.limit.mockResolvedValueOnce([mockPosition]);

      mockOrderService.placeOrder.mockResolvedValueOnce({
        success: true,
        internalOrderId: 'order-123',
      });

      const result = await positionService.closePosition({
        userId: testUserId,
        userAddress: testUserAddress,
        symbol: 'BTC',
        orderType: 'limit',
        limitPrice: 52000,
      });

      expect(result.success).toBe(true);
      expect(mockOrderService.placeOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          orderType: 'limit',
          price: 52000,
          timeInForce: 'Gtc',
        })
      );
    });

    it('should fail if position not found', async () => {
      mockDb.limit.mockResolvedValueOnce([]);

      const result = await positionService.closePosition({
        userId: testUserId,
        userAddress: testUserAddress,
        symbol: 'BTC',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should handle order placement failure', async () => {
      const mockPosition = {
        id: '1',
        userId: testUserId,
        symbol: 'BTC',
        side: 'long',
        size: '0.5',
        closedAt: null,
      };

      mockDb.limit.mockResolvedValueOnce([mockPosition]);
      mockClient.getAllMids.mockResolvedValueOnce({ BTC: '51000' });

      mockOrderService.placeOrder.mockResolvedValueOnce({
        success: false,
        error: 'Insufficient liquidity',
      });

      const result = await positionService.closePosition({
        userId: testUserId,
        userAddress: testUserAddress,
        symbol: 'BTC',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Insufficient liquidity');
    });
  });

  describe('Position Polling', () => {
    it('should start polling positions', async () => {
      mockClient.getUserState.mockResolvedValue({
        assetPositions: [],
      });
      mockClient.getAllMids.mockResolvedValue({});
      mockDb.where.mockResolvedValue([]);

      await positionService.startPositionPolling(testUserId, testUserAddress, 100);

      // Should perform initial sync
      expect(mockClient.getUserState).toHaveBeenCalled();
    });

    it('should poll at specified interval', async () => {
      mockClient.getUserState.mockResolvedValue({
        assetPositions: [],
      });
      mockClient.getAllMids.mockResolvedValue({});
      mockDb.where.mockResolvedValue([]);

      await positionService.startPositionPolling(testUserId, testUserAddress, 100);

      // Wait for multiple intervals
      await new Promise((resolve) => setTimeout(resolve, 350));

      positionService.stopPositionPolling(testUserId);

      // Should have called multiple times (initial + polling)
      expect(mockClient.getUserState.mock.calls.length).toBeGreaterThan(1);
    }, 10000);

    it('should stop polling when requested', async () => {
      mockClient.getUserState.mockResolvedValue({
        assetPositions: [],
      });
      mockClient.getAllMids.mockResolvedValue({});
      mockDb.where.mockResolvedValue([]);

      await positionService.startPositionPolling(testUserId, testUserAddress, 100);

      const callsBefore = mockClient.getUserState.mock.calls.length;

      positionService.stopPositionPolling(testUserId);

      // Wait to ensure polling stopped
      await new Promise((resolve) => setTimeout(resolve, 300));

      const callsAfter = mockClient.getUserState.mock.calls.length;

      // Should not have increased significantly after stopping
      expect(callsAfter - callsBefore).toBeLessThan(2);
    }, 10000);

    it('should clear existing interval when starting new poll', async () => {
      mockClient.getUserState.mockResolvedValue({
        assetPositions: [],
      });
      mockClient.getAllMids.mockResolvedValue({});
      mockDb.where.mockResolvedValue([]);

      await positionService.startPositionPolling(testUserId, testUserAddress, 100);
      await positionService.startPositionPolling(testUserId, testUserAddress, 100);

      // Should handle restart gracefully
      positionService.stopPositionPolling(testUserId);
    });
  });

  describe('Margin Summary', () => {
    it('should get margin summary from API', async () => {
      mockClient.getUserState.mockResolvedValueOnce({
        marginSummary: {
          accountValue: '10000',
          totalMarginUsed: '3000',
          totalNtlPos: '500',
        },
      });

      const summary = await positionService.getMarginSummary(testUserAddress);

      expect(summary).toEqual({
        accountValue: 10000,
        totalMarginUsed: 3000,
        availableMargin: 7000,
        totalUnrealizedPnl: 500,
        marginRatio: 30,
      });
    });

    it('should calculate margin ratio correctly', async () => {
      mockClient.getUserState.mockResolvedValueOnce({
        marginSummary: {
          accountValue: '10000',
          totalMarginUsed: '5000',
          totalNtlPos: '0',
        },
      });

      const summary = await positionService.getMarginSummary(testUserAddress);

      expect(summary?.marginRatio).toBe(50); // 5000/10000 * 100
    });

    it('should handle zero account value', async () => {
      mockClient.getUserState.mockResolvedValueOnce({
        marginSummary: {
          accountValue: '0',
          totalMarginUsed: '0',
          totalNtlPos: '0',
        },
      });

      const summary = await positionService.getMarginSummary(testUserAddress);

      expect(summary?.marginRatio).toBe(0);
    });

    it('should return null if no user state', async () => {
      mockClient.getUserState.mockResolvedValueOnce(null);

      const summary = await positionService.getMarginSummary(testUserAddress);

      expect(summary).toBeNull();
    });
  });

  describe('Shutdown', () => {
    it('should stop all polling intervals', async () => {
      mockClient.getUserState.mockResolvedValue({
        assetPositions: [],
      });
      mockClient.getAllMids.mockResolvedValue({});
      mockDb.where.mockResolvedValue([]);

      await positionService.startPositionPolling('user-1', '0x1111111111111111111111111111111111111111', 100);
      await positionService.startPositionPolling('user-2', '0x2222222222222222222222222222222222222222', 100);

      await positionService.shutdown();

      // Wait to ensure polling stopped
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Polling should be stopped
    }, 10000);

    it('should remove all event listeners', async () => {
      const handler = vi.fn();
      positionService.on('positionUpdate', handler);

      expect(positionService.listenerCount('positionUpdate')).toBe(1);

      await positionService.shutdown();

      expect(positionService.listenerCount('positionUpdate')).toBe(0);
    });
  });
});

describe('Singleton Functions', () => {
  afterEach(() => {
    resetPositionManagementService();
  });

  describe('getPositionManagementService', () => {
    it('should return singleton instance', () => {
      const instance1 = getPositionManagementService();
      const instance2 = getPositionManagementService();

      expect(instance1).toBe(instance2);
    });

    it('should create new instance on first call', () => {
      const instance = getPositionManagementService();

      expect(instance).toBeInstanceOf(PositionManagementService);
    });
  });

  describe('resetPositionManagementService', () => {
    it('should reset singleton instance', () => {
      const instance1 = getPositionManagementService();

      resetPositionManagementService();

      const instance2 = getPositionManagementService();

      expect(instance1).not.toBe(instance2);
    });

    it('should shutdown instance before resetting', async () => {
      const instance = getPositionManagementService();
      const shutdownSpy = vi.spyOn(instance, 'shutdown');

      resetPositionManagementService();

      expect(shutdownSpy).toHaveBeenCalled();
    });
  });
});
