import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  OrderExecutionService,
  getOrderExecutionService,
  resetOrderExecutionService,
  OrderValidationError,
  type PlaceOrderParams,
} from '../services/hyperliquid/OrderExecutionService';

// Mock dependencies
vi.mock('../services/hyperliquid/HyperliquidClient', () => ({
  getHyperliquidClient: vi.fn(() => mockClient),
}));

vi.mock('../../lib/db', () => ({
  db: mockDb,
}));

// Mock client
const mockClient = {
  placeOrder: vi.fn(),
  cancelOrder: vi.fn(),
  cancelAllOrders: vi.fn(),
  getUserState: vi.fn(),
  getAllMetas: vi.fn(),
};

// Mock database
const mockDb = {
  select: vi.fn(() => mockDb),
  from: vi.fn(() => mockDb),
  where: vi.fn(() => mockDb),
  orderBy: vi.fn(() => mockDb),
  limit: vi.fn(() => mockDb),
  update: vi.fn(() => mockDb),
  set: vi.fn(() => mockDb),
  insert: vi.fn(() => mockDb),
  values: vi.fn(() => mockDb),
  returning: vi.fn(() => mockDb),
};

describe('OrderExecutionService', () => {
  let orderService: OrderExecutionService;

  const validOrderParams: PlaceOrderParams = {
    userId: 'user-123',
    userAddress: '0x1234567890123456789012345678901234567890',
    symbol: 'BTC',
    side: 'buy',
    orderType: 'limit',
    price: 50000,
    size: 0.1,
    timeInForce: 'Gtc',
  };

  beforeEach(() => {
    orderService = new OrderExecutionService();
    vi.clearAllMocks();
  });

  describe('Order Validation', () => {
    it('should validate successful order', async () => {
      mockClient.getUserState.mockResolvedValueOnce({
        marginSummary: {
          accountValue: '10000',
          totalMarginUsed: '1000',
        },
        assetPositions: [],
      });

      mockDb.returning.mockResolvedValueOnce([{
        id: 1,
        internalOrderId: 'order-123',
        status: 'pending',
      }]);

      mockClient.placeOrder.mockResolvedValueOnce({
        status: 'ok',
        response: {
          data: {
            statuses: [{
              oid: 'hl-order-123',
            }],
          },
        },
      });

      const result = await orderService.placeOrder(validOrderParams);

      expect(result.success).toBe(true);
      expect(result.hyperliquidOrderId).toBe('hl-order-123');
    });

    it('should reject order with invalid symbol', async () => {
      const invalidParams = { ...validOrderParams, symbol: '' };

      const result = await orderService.placeOrder(invalidParams);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid symbol');
    });

    it('should reject order with invalid side', async () => {
      const invalidParams = { ...validOrderParams, side: 'invalid' as any };

      const result = await orderService.placeOrder(invalidParams);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid order side');
    });

    it('should reject order with invalid order type', async () => {
      const invalidParams = { ...validOrderParams, orderType: 'invalid' as any };

      const result = await orderService.placeOrder(invalidParams);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid order type');
    });

    it('should reject order with zero size', async () => {
      const invalidParams = { ...validOrderParams, size: 0 };

      const result = await orderService.placeOrder(invalidParams);

      expect(result.success).toBe(false);
      expect(result.error).toContain('size must be positive');
    });

    it('should reject order with negative size', async () => {
      const invalidParams = { ...validOrderParams, size: -1 };

      const result = await orderService.placeOrder(invalidParams);

      expect(result.success).toBe(false);
      expect(result.error).toContain('size must be positive');
    });

    it('should reject limit order without price', async () => {
      const invalidParams = { ...validOrderParams, price: undefined };

      const result = await orderService.placeOrder(invalidParams);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Limit orders must have a positive price');
    });

    it('should reject limit order with zero price', async () => {
      const invalidParams = { ...validOrderParams, price: 0 };

      const result = await orderService.placeOrder(invalidParams);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Limit orders must have a positive price');
    });

    it('should reject order with invalid timeInForce', async () => {
      const invalidParams = { ...validOrderParams, timeInForce: 'Invalid' as any };

      const result = await orderService.placeOrder(invalidParams);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid timeInForce');
    });

    it('should reject order with invalid user address', async () => {
      const invalidParams = { ...validOrderParams, userAddress: 'invalid' };

      const result = await orderService.placeOrder(invalidParams);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid user address');
    });

    it('should reject order below minimum size', async () => {
      const invalidParams = { ...validOrderParams, size: 0.0001 }; // Below 0.001 min for BTC

      const result = await orderService.placeOrder(invalidParams);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Minimum order size');
    });

    it('should accept valid timeInForce values', async () => {
      const validTifValues = ['Gtc', 'Ioc', 'Alo'] as const;

      for (const tif of validTifValues) {
        mockClient.getUserState.mockResolvedValueOnce({
          marginSummary: {
            accountValue: '10000',
            totalMarginUsed: '1000',
          },
          assetPositions: [],
        });

        mockDb.returning.mockResolvedValueOnce([{
          id: 1,
          internalOrderId: 'order-123',
          status: 'pending',
        }]);

        mockClient.placeOrder.mockResolvedValueOnce({
          status: 'ok',
          response: {
            data: {
              statuses: [{
                oid: 'hl-order-123',
              }],
            },
          },
        });

        const params = { ...validOrderParams, timeInForce: tif };
        const result = await orderService.placeOrder(params);

        expect(result.success).toBe(true);
      }
    });
  });

  describe('Balance Validation', () => {
    it('should reject order with insufficient margin', async () => {
      mockClient.getUserState.mockResolvedValueOnce({
        marginSummary: {
          accountValue: '1000',    // $1000 total
          totalMarginUsed: '950',  // $950 used
        },
        assetPositions: [],
      });

      // Order value: 50000 * 0.1 = 5000
      // Margin required (10%): 500
      // Available: 1000 - 950 = 50 (insufficient)
      const result = await orderService.placeOrder(validOrderParams);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Insufficient margin');
    });

    it('should accept order with sufficient margin', async () => {
      mockClient.getUserState.mockResolvedValueOnce({
        marginSummary: {
          accountValue: '10000',
          totalMarginUsed: '1000',
        },
        assetPositions: [],
      });

      mockDb.returning.mockResolvedValueOnce([{
        id: 1,
        internalOrderId: 'order-123',
        status: 'pending',
      }]);

      mockClient.placeOrder.mockResolvedValueOnce({
        status: 'ok',
        response: {
          data: {
            statuses: [{
              oid: 'hl-order-123',
            }],
          },
        },
      });

      const result = await orderService.placeOrder(validOrderParams);

      expect(result.success).toBe(true);
    });

    it('should handle getUserState failure gracefully', async () => {
      mockClient.getUserState.mockRejectedValueOnce(new Error('API error'));

      mockDb.returning.mockResolvedValueOnce([{
        id: 1,
        internalOrderId: 'order-123',
        status: 'pending',
      }]);

      mockClient.placeOrder.mockResolvedValueOnce({
        status: 'ok',
        response: {
          data: {
            statuses: [{
              oid: 'hl-order-123',
            }],
          },
        },
      });

      // Should proceed even if balance check fails (Hyperliquid will validate)
      const result = await orderService.placeOrder(validOrderParams);

      expect(result.success).toBe(true);
    });
  });

  describe('Reduce-Only Orders', () => {
    it('should accept reduce-only sell order for long position', async () => {
      mockClient.getUserState.mockResolvedValueOnce({
        marginSummary: {
          accountValue: '10000',
          totalMarginUsed: '1000',
        },
        assetPositions: [{
          position: {
            coin: 'BTC',
            szi: '0.5', // Long position
          },
        }],
      });

      mockDb.returning.mockResolvedValueOnce([{
        id: 1,
        internalOrderId: 'order-123',
        status: 'pending',
      }]);

      mockClient.placeOrder.mockResolvedValueOnce({
        status: 'ok',
        response: {
          data: {
            statuses: [{
              oid: 'hl-order-123',
            }],
          },
        },
      });

      const reduceOnlyParams = {
        ...validOrderParams,
        side: 'sell' as const,
        size: 0.3,
        reduceOnly: true,
      };

      const result = await orderService.placeOrder(reduceOnlyParams);

      expect(result.success).toBe(true);
    });

    it('should accept reduce-only buy order for short position', async () => {
      mockClient.getUserState.mockResolvedValueOnce({
        marginSummary: {
          accountValue: '10000',
          totalMarginUsed: '1000',
        },
        assetPositions: [{
          position: {
            coin: 'BTC',
            szi: '-0.5', // Short position
          },
        }],
      });

      mockDb.returning.mockResolvedValueOnce([{
        id: 1,
        internalOrderId: 'order-123',
        status: 'pending',
      }]);

      mockClient.placeOrder.mockResolvedValueOnce({
        status: 'ok',
        response: {
          data: {
            statuses: [{
              oid: 'hl-order-123',
            }],
          },
        },
      });

      const reduceOnlyParams = {
        ...validOrderParams,
        side: 'buy' as const,
        size: 0.3,
        reduceOnly: true,
      };

      const result = await orderService.placeOrder(reduceOnlyParams);

      expect(result.success).toBe(true);
    });

    it('should reject reduce-only order with no position', async () => {
      mockClient.getUserState.mockResolvedValueOnce({
        marginSummary: {
          accountValue: '10000',
          totalMarginUsed: '1000',
        },
        assetPositions: [], // No position
      });

      const reduceOnlyParams = {
        ...validOrderParams,
        reduceOnly: true,
      };

      const result = await orderService.placeOrder(reduceOnlyParams);

      expect(result.success).toBe(false);
      expect(result.error).toContain('No position to reduce');
    });

    it('should reject reduce-only sell order without long position', async () => {
      mockClient.getUserState.mockResolvedValueOnce({
        marginSummary: {
          accountValue: '10000',
          totalMarginUsed: '1000',
        },
        assetPositions: [{
          position: {
            coin: 'BTC',
            szi: '-0.5', // Short position
          },
        }],
      });

      const reduceOnlyParams = {
        ...validOrderParams,
        side: 'sell' as const,
        reduceOnly: true,
      };

      const result = await orderService.placeOrder(reduceOnlyParams);

      expect(result.success).toBe(false);
      expect(result.error).toContain('long position');
    });

    it('should reject reduce-only order exceeding position size', async () => {
      mockClient.getUserState.mockResolvedValueOnce({
        marginSummary: {
          accountValue: '10000',
          totalMarginUsed: '1000',
        },
        assetPositions: [{
          position: {
            coin: 'BTC',
            szi: '0.05', // Small long position
          },
        }],
      });

      const reduceOnlyParams = {
        ...validOrderParams,
        side: 'sell' as const,
        size: 0.1, // Exceeds position size of 0.05
        reduceOnly: true,
      };

      const result = await orderService.placeOrder(reduceOnlyParams);

      expect(result.success).toBe(false);
      expect(result.error).toContain('exceeds position size');
    });
  });

  describe('Order Placement', () => {
    it('should place successful order', async () => {
      mockClient.getUserState.mockResolvedValueOnce({
        marginSummary: {
          accountValue: '10000',
          totalMarginUsed: '1000',
        },
        assetPositions: [],
      });

      const savedOrder = {
        id: 1,
        internalOrderId: 'order-123',
        status: 'pending',
      };

      mockDb.returning.mockResolvedValueOnce([savedOrder]);

      mockClient.placeOrder.mockResolvedValueOnce({
        status: 'ok',
        response: {
          data: {
            statuses: [{
              oid: 'hl-order-456',
            }],
          },
        },
      });

      const result = await orderService.placeOrder(validOrderParams);

      expect(result.success).toBe(true);
      expect(result.status).toBe('open');
      expect(result.hyperliquidOrderId).toBe('hl-order-456');
      expect(mockClient.placeOrder).toHaveBeenCalled();
    });

    it('should handle order rejection from Hyperliquid', async () => {
      mockClient.getUserState.mockResolvedValueOnce({
        marginSummary: {
          accountValue: '10000',
          totalMarginUsed: '1000',
        },
        assetPositions: [],
      });

      mockDb.returning.mockResolvedValueOnce([{
        id: 1,
        internalOrderId: 'order-123',
        status: 'pending',
      }]);

      mockClient.placeOrder.mockResolvedValueOnce({
        status: 'ok',
        response: {
          data: {
            statuses: [{
              error: 'Insufficient liquidity',
            }],
          },
        },
      });

      const result = await orderService.placeOrder(validOrderParams);

      expect(result.success).toBe(false);
      expect(result.status).toBe('failed');
      expect(result.error).toContain('Insufficient liquidity');
    });

    it('should handle Hyperliquid API error response', async () => {
      mockClient.getUserState.mockResolvedValueOnce({
        marginSummary: {
          accountValue: '10000',
          totalMarginUsed: '1000',
        },
        assetPositions: [],
      });

      mockDb.returning.mockResolvedValueOnce([{
        id: 1,
        internalOrderId: 'order-123',
        status: 'pending',
      }]);

      mockClient.placeOrder.mockResolvedValueOnce({
        status: 'error',
        response: 'API error occurred',
      });

      const result = await orderService.placeOrder(validOrderParams);

      expect(result.success).toBe(false);
      expect(result.status).toBe('failed');
    });

    it('should use custom clientOrderId if provided', async () => {
      mockClient.getUserState.mockResolvedValueOnce({
        marginSummary: {
          accountValue: '10000',
          totalMarginUsed: '1000',
        },
        assetPositions: [],
      });

      mockDb.returning.mockResolvedValueOnce([{
        id: 1,
        internalOrderId: 'custom-order-id',
        status: 'pending',
      }]);

      mockClient.placeOrder.mockResolvedValueOnce({
        status: 'ok',
        response: {
          data: {
            statuses: [{
              oid: 'hl-order-123',
            }],
          },
        },
      });

      const customParams = {
        ...validOrderParams,
        clientOrderId: 'custom-order-id',
      };

      const result = await orderService.placeOrder(customParams);

      expect(result.internalOrderId).toBe('custom-order-id');
    });
  });

  describe('Order Cancellation', () => {
    it('should cancel order successfully', async () => {
      const mockOrder = {
        id: 1,
        internalOrderId: 'order-123',
        hyperliquidOrderId: 'hl-order-123',
        symbol: 'BTC',
        status: 'open',
      };

      mockDb.limit.mockResolvedValueOnce([mockOrder]);

      mockClient.cancelOrder.mockResolvedValueOnce({
        status: 'ok',
      });

      const result = await orderService.cancelOrder({
        userId: 'user-123',
        userAddress: '0x1234567890123456789012345678901234567890',
        orderId: 'order-123',
        symbol: 'BTC',
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('cancelled successfully');
      expect(mockClient.cancelOrder).toHaveBeenCalledWith('hl-order-123', 'BTC');
    });

    it('should fail if order not found', async () => {
      mockDb.limit.mockResolvedValueOnce([]);

      const result = await orderService.cancelOrder({
        userId: 'user-123',
        userAddress: '0x1234567890123456789012345678901234567890',
        orderId: 'non-existent',
        symbol: 'BTC',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should fail if order has no Hyperliquid order ID', async () => {
      const mockOrder = {
        id: 1,
        internalOrderId: 'order-123',
        hyperliquidOrderId: null,
        status: 'pending',
      };

      mockDb.limit.mockResolvedValueOnce([mockOrder]);

      const result = await orderService.cancelOrder({
        userId: 'user-123',
        userAddress: '0x1234567890123456789012345678901234567890',
        orderId: 'order-123',
        symbol: 'BTC',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('no Hyperliquid order ID');
    });

    it('should fail if order is not open', async () => {
      const mockOrder = {
        id: 1,
        internalOrderId: 'order-123',
        hyperliquidOrderId: 'hl-order-123',
        status: 'filled',
      };

      mockDb.limit.mockResolvedValueOnce([mockOrder]);

      const result = await orderService.cancelOrder({
        userId: 'user-123',
        userAddress: '0x1234567890123456789012345678901234567890',
        orderId: 'order-123',
        symbol: 'BTC',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('cannot be cancelled');
    });
  });

  describe('Cancel All Orders', () => {
    it('should cancel all orders for a symbol', async () => {
      const mockOrders = [
        {
          id: 1,
          internalOrderId: 'order-1',
          symbol: 'BTC',
          status: 'open',
        },
        {
          id: 2,
          internalOrderId: 'order-2',
          symbol: 'BTC',
          status: 'open',
        },
      ];

      mockDb.orderBy.mockResolvedValueOnce(mockOrders);

      mockClient.cancelAllOrders.mockResolvedValueOnce({
        status: 'ok',
      });

      const result = await orderService.cancelAllOrders({
        userId: 'user-123',
        userAddress: '0x1234567890123456789012345678901234567890',
        symbol: 'BTC',
      });

      expect(result.success).toBe(true);
      expect(result.cancelledCount).toBe(2);
      expect(mockClient.cancelAllOrders).toHaveBeenCalledWith('BTC');
    });

    it('should handle no orders to cancel', async () => {
      mockDb.orderBy.mockResolvedValueOnce([]);

      const result = await orderService.cancelAllOrders({
        userId: 'user-123',
        userAddress: '0x1234567890123456789012345678901234567890',
        symbol: 'BTC',
      });

      expect(result.success).toBe(true);
      expect(result.cancelledCount).toBe(0);
      expect(result.message).toContain('No open orders');
    });
  });

  describe('Fee Estimation', () => {
    it('should calculate maker fees correctly', () => {
      const fees = orderService.estimateFees({
        symbol: 'BTC',
        size: 0.1,
        price: 50000,
        isMaker: true,
      });

      // Order value: 0.1 * 50000 = 5000
      // Maker fee: 0.025% = 5000 * 0.00025 = 1.25
      expect(fees.feeRate).toBe(0.00025);
      expect(fees.estimatedFee).toBe(1.25);
    });

    it('should calculate taker fees correctly', () => {
      const fees = orderService.estimateFees({
        symbol: 'BTC',
        size: 0.1,
        price: 50000,
        isMaker: false,
      });

      // Order value: 0.1 * 50000 = 5000
      // Taker fee: 0.035% = 5000 * 0.00035 = 1.75
      expect(fees.feeRate).toBe(0.00035);
      expect(fees.estimatedFee).toBe(1.75);
    });
  });

  describe('Order Limits', () => {
    it('should get order limits for a symbol', async () => {
      mockClient.getAllMetas.mockResolvedValueOnce({
        universe: [{
          name: 'BTC',
          szDecimals: 3,
        }],
      });

      const limits = await orderService.getOrderLimits('BTC');

      expect(limits).toHaveProperty('minSize');
      expect(limits).toHaveProperty('maxSize');
      expect(limits).toHaveProperty('sizeIncrement');
      expect(limits).toHaveProperty('priceIncrement');
      expect(limits.sizeIncrement).toBe(0.001); // 10^-3
    });

    it('should throw error for unknown symbol', async () => {
      mockClient.getAllMetas.mockResolvedValueOnce({
        universe: [],
      });

      await expect(orderService.getOrderLimits('UNKNOWN')).rejects.toThrow(
        'Symbol UNKNOWN not found'
      );
    });
  });

  describe('Database Operations', () => {
    it('should get order by internal ID', async () => {
      const mockOrder = {
        id: 1,
        internalOrderId: 'order-123',
        symbol: 'BTC',
      };

      mockDb.limit.mockResolvedValueOnce([mockOrder]);

      const order = await orderService.getOrderByInternalId('order-123');

      expect(order).toEqual(mockOrder);
    });

    it('should return null for non-existent order', async () => {
      mockDb.limit.mockResolvedValueOnce([]);

      const order = await orderService.getOrderByInternalId('non-existent');

      expect(order).toBeNull();
    });

    it('should get user orders', async () => {
      const mockOrders = [
        { id: 1, internalOrderId: 'order-1' },
        { id: 2, internalOrderId: 'order-2' },
      ];

      mockDb.limit.mockResolvedValueOnce(mockOrders);

      const orders = await orderService.getUserOrders('user-123');

      expect(orders).toEqual(mockOrders);
    });

    it('should get user open orders', async () => {
      const mockOrders = [
        { id: 1, internalOrderId: 'order-1', status: 'open' },
      ];

      mockDb.orderBy.mockResolvedValueOnce(mockOrders);

      const orders = await orderService.getUserOpenOrders('user-123');

      expect(orders).toEqual(mockOrders);
    });
  });
});

describe('Singleton Functions', () => {
  afterEach(() => {
    resetOrderExecutionService();
  });

  describe('getOrderExecutionService', () => {
    it('should return singleton instance', () => {
      const instance1 = getOrderExecutionService();
      const instance2 = getOrderExecutionService();

      expect(instance1).toBe(instance2);
    });

    it('should create new instance on first call', () => {
      const instance = getOrderExecutionService();

      expect(instance).toBeInstanceOf(OrderExecutionService);
    });
  });

  describe('resetOrderExecutionService', () => {
    it('should reset singleton instance', () => {
      const instance1 = getOrderExecutionService();

      resetOrderExecutionService();

      const instance2 = getOrderExecutionService();

      expect(instance1).not.toBe(instance2);
    });
  });
});
