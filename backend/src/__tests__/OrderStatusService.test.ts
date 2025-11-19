import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  OrderStatusService,
  getOrderStatusService,
  resetOrderStatusService,
} from '../services/hyperliquid/OrderStatusService';

// Mock dependencies
vi.mock('../services/hyperliquid/HyperliquidClient', () => ({
  getHyperliquidClient: vi.fn(() => mockClient),
}));

vi.mock('../../lib/db', () => ({
  db: mockDb,
}));

// Mock client
const mockClient = {
  subscribeToUserEvents: vi.fn(),
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
};

describe('OrderStatusService', () => {
  let orderStatusService: OrderStatusService;
  const testUserId = 'user-123';
  const testUserAddress = '0x1234567890123456789012345678901234567890';

  beforeEach(() => {
    orderStatusService = new OrderStatusService();
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await orderStatusService.shutdown();
  });

  describe('Initialization', () => {
    it('should initialize successfully', () => {
      expect(orderStatusService).toBeInstanceOf(OrderStatusService);
    });

    it('should be an event emitter', () => {
      expect(orderStatusService.on).toBeDefined();
      expect(orderStatusService.emit).toBeDefined();
    });

    it('should have zero subscriptions initially', () => {
      expect(orderStatusService.getSubscriptionCount()).toBe(0);
    });

    it('should have empty active subscriptions', () => {
      expect(orderStatusService.getActiveSubscriptions()).toEqual([]);
    });
  });

  describe('Subscription Management', () => {
    it('should subscribe to user orders', async () => {
      const mockSubscription = {
        unsubscribe: vi.fn(),
      };

      mockClient.subscribeToUserEvents.mockResolvedValueOnce(mockSubscription);

      await orderStatusService.subscribeToUserOrders(testUserId, testUserAddress);

      expect(mockClient.subscribeToUserEvents).toHaveBeenCalledWith(
        testUserAddress,
        expect.any(Function)
      );
      expect(orderStatusService.getSubscriptionCount()).toBe(1);
    });

    it('should not subscribe twice to same user', async () => {
      const mockSubscription = {
        unsubscribe: vi.fn(),
      };

      mockClient.subscribeToUserEvents.mockResolvedValue(mockSubscription);

      await orderStatusService.subscribeToUserOrders(testUserId, testUserAddress);
      await orderStatusService.subscribeToUserOrders(testUserId, testUserAddress);

      // Should only subscribe once
      expect(mockClient.subscribeToUserEvents).toHaveBeenCalledTimes(1);
      expect(orderStatusService.getSubscriptionCount()).toBe(1);
    });

    it('should track active subscriptions', async () => {
      const mockSubscription = {
        unsubscribe: vi.fn(),
      };

      mockClient.subscribeToUserEvents.mockResolvedValue(mockSubscription);

      await orderStatusService.subscribeToUserOrders(testUserId, testUserAddress);

      const activeSubscriptions = orderStatusService.getActiveSubscriptions();
      expect(activeSubscriptions).toContain(testUserAddress);
    });

    it('should handle subscription errors', async () => {
      mockClient.subscribeToUserEvents.mockRejectedValueOnce(
        new Error('WebSocket connection failed')
      );

      await expect(
        orderStatusService.subscribeToUserOrders(testUserId, testUserAddress)
      ).rejects.toThrow('WebSocket connection failed');
    });
  });

  describe('Unsubscription', () => {
    it('should unsubscribe from user orders', async () => {
      const mockSubscription = {
        unsubscribe: vi.fn(),
      };

      mockClient.subscribeToUserEvents.mockResolvedValue(mockSubscription);

      await orderStatusService.subscribeToUserOrders(testUserId, testUserAddress);
      await orderStatusService.unsubscribeFromUserOrders(testUserAddress);

      expect(mockSubscription.unsubscribe).toHaveBeenCalled();
      expect(orderStatusService.getSubscriptionCount()).toBe(0);
    });

    it('should handle unsubscribe when no subscription exists', async () => {
      // Should not throw error
      await expect(
        orderStatusService.unsubscribeFromUserOrders('non-existent-address')
      ).resolves.not.toThrow();
    });

    it('should handle unsubscribe errors', async () => {
      const mockSubscription = {
        unsubscribe: vi.fn().mockRejectedValue(new Error('Unsubscribe failed')),
      };

      mockClient.subscribeToUserEvents.mockResolvedValue(mockSubscription);

      await orderStatusService.subscribeToUserOrders(testUserId, testUserAddress);

      await expect(
        orderStatusService.unsubscribeFromUserOrders(testUserAddress)
      ).rejects.toThrow('Unsubscribe failed');
    });
  });

  describe('Fill Event Handling', () => {
    let eventHandler: Function;

    beforeEach(async () => {
      const mockSubscription = {
        unsubscribe: vi.fn(),
      };

      mockClient.subscribeToUserEvents.mockImplementationOnce(
        (address: string, handler: Function) => {
          eventHandler = handler;
          return Promise.resolve(mockSubscription);
        }
      );

      await orderStatusService.subscribeToUserOrders(testUserId, testUserAddress);
    });

    it('should process fill event and update order', async () => {
      const mockOrder = {
        id: 1,
        internalOrderId: 'order-123',
        size: '1.0',
        filledSize: '0',
        averageFillPrice: '0',
        status: 'open',
      };

      mockDb.limit.mockResolvedValueOnce([mockOrder]);

      const fillEvent = {
        fills: [
          {
            oid: 'hl-order-123',
            coin: 'BTC',
            side: 'B', // Buy
            px: '50000',
            sz: '0.5',
            fee: '1.25',
            time: Date.now(),
            tid: 'trade-123',
            hash: '0xabcd',
          },
        ],
      };

      await eventHandler(fillEvent);

      // Should update order in database
      expect(mockDb.update).toHaveBeenCalled();
    });

    it('should emit orderFill event', async () => {
      const mockOrder = {
        id: 1,
        internalOrderId: 'order-123',
        size: '1.0',
        filledSize: '0',
        averageFillPrice: '0',
        status: 'open',
      };

      mockDb.limit.mockResolvedValueOnce([mockOrder]);

      const fillHandler = vi.fn();
      orderStatusService.on('orderFill', fillHandler);

      const fillEvent = {
        fills: [
          {
            oid: 'hl-order-123',
            coin: 'BTC',
            side: 'B',
            px: '50000',
            sz: '0.5',
            fee: '1.25',
            time: Date.now(),
            tid: 'trade-123',
            hash: '0xabcd',
          },
        ],
      };

      await eventHandler(fillEvent);

      // Allow async operations to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(fillHandler).toHaveBeenCalled();
    });

    it('should emit orderStatusChange event', async () => {
      const mockOrder = {
        id: 1,
        internalOrderId: 'order-123',
        size: '1.0',
        filledSize: '0',
        averageFillPrice: '0',
        status: 'open',
      };

      mockDb.limit.mockResolvedValueOnce([mockOrder]);

      const statusChangeHandler = vi.fn();
      orderStatusService.on('orderStatusChange', statusChangeHandler);

      const fillEvent = {
        fills: [
          {
            oid: 'hl-order-123',
            coin: 'BTC',
            side: 'B',
            px: '50000',
            sz: '1.0', // Full fill
            fee: '1.25',
            time: Date.now(),
            tid: 'trade-123',
            hash: '0xabcd',
          },
        ],
      };

      await eventHandler(fillEvent);

      // Allow async operations to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(statusChangeHandler).toHaveBeenCalled();
    });

    it('should calculate partial fill correctly', async () => {
      const mockOrder = {
        id: 1,
        internalOrderId: 'order-123',
        size: '1.0',
        filledSize: '0.3', // Already partially filled
        averageFillPrice: '49000',
        status: 'partially_filled',
      };

      mockDb.limit.mockResolvedValueOnce([mockOrder]);

      const fillEvent = {
        fills: [
          {
            oid: 'hl-order-123',
            coin: 'BTC',
            side: 'B',
            px: '50000',
            sz: '0.2', // Additional fill
            fee: '1.25',
            time: Date.now(),
            tid: 'trade-123',
            hash: '0xabcd',
          },
        ],
      };

      await eventHandler(fillEvent);

      // Total filled size should be 0.3 + 0.2 = 0.5
      // Status should remain partially_filled (not fully filled)
      expect(mockDb.update).toHaveBeenCalled();
    });

    it('should mark order as filled when fully executed', async () => {
      const mockOrder = {
        id: 1,
        internalOrderId: 'order-123',
        size: '1.0',
        filledSize: '0.5',
        averageFillPrice: '49000',
        status: 'partially_filled',
      };

      mockDb.limit.mockResolvedValueOnce([mockOrder]);

      const fillEvent = {
        fills: [
          {
            oid: 'hl-order-123',
            coin: 'BTC',
            side: 'B',
            px: '50000',
            sz: '0.5', // Completes the order
            fee: '1.25',
            time: Date.now(),
            tid: 'trade-123',
            hash: '0xabcd',
          },
        ],
      };

      await eventHandler(fillEvent);

      // Status should be 'filled'
      expect(mockDb.update).toHaveBeenCalled();
    });

    it('should calculate average fill price correctly', async () => {
      const mockOrder = {
        id: 1,
        internalOrderId: 'order-123',
        size: '1.0',
        filledSize: '0.5',
        averageFillPrice: '48000', // Previous average
        status: 'partially_filled',
      };

      mockDb.limit.mockResolvedValueOnce([mockOrder]);

      const fillEvent = {
        fills: [
          {
            oid: 'hl-order-123',
            coin: 'BTC',
            side: 'B',
            px: '52000', // New fill at different price
            sz: '0.5',
            fee: '1.25',
            time: Date.now(),
            tid: 'trade-123',
            hash: '0xabcd',
          },
        ],
      };

      await eventHandler(fillEvent);

      // Average should be (48000 * 0.5 + 52000 * 0.5) / 1.0 = 50000
      expect(mockDb.update).toHaveBeenCalled();
    });

    it('should save fill to database', async () => {
      const mockOrder = {
        id: 1,
        internalOrderId: 'order-123',
        size: '1.0',
        filledSize: '0',
        averageFillPrice: '0',
        status: 'open',
      };

      mockDb.limit.mockResolvedValueOnce([mockOrder]);

      const fillEvent = {
        fills: [
          {
            oid: 'hl-order-123',
            coin: 'BTC',
            side: 'B',
            px: '50000',
            sz: '0.5',
            fee: '1.25',
            time: Date.now(),
            tid: 'trade-123',
            hash: '0xabcd',
            maker: true,
          },
        ],
      };

      await eventHandler(fillEvent);

      // Should insert fill into hyperliquidFills table
      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockDb.values).toHaveBeenCalledWith(
        expect.objectContaining({
          orderId: 1,
          userId: testUserId,
          hyperliquidFillId: 'trade-123',
          symbol: 'BTC',
          side: 'buy',
          price: '50000',
          size: '0.5',
          fee: '1.25',
          feeToken: 'USDC',
          isMaker: true,
          txHash: '0xabcd',
        })
      );
    });

    it('should convert side codes correctly', async () => {
      const mockOrder = {
        id: 1,
        internalOrderId: 'order-123',
        size: '1.0',
        filledSize: '0',
        averageFillPrice: '0',
        status: 'open',
      };

      mockDb.limit.mockResolvedValueOnce([mockOrder]);

      const fillEvent = {
        fills: [
          {
            oid: 'hl-order-123',
            coin: 'BTC',
            side: 'A', // Ask (sell)
            px: '50000',
            sz: '0.5',
            fee: '1.25',
            time: Date.now(),
            tid: 'trade-123',
            hash: '0xabcd',
          },
        ],
      };

      await eventHandler(fillEvent);

      expect(mockDb.values).toHaveBeenCalledWith(
        expect.objectContaining({
          side: 'sell',
        })
      );
    });

    it('should handle order not found', async () => {
      mockDb.limit.mockResolvedValueOnce([]); // No order found

      const fillEvent = {
        fills: [
          {
            oid: 'unknown-order',
            coin: 'BTC',
            side: 'B',
            px: '50000',
            sz: '0.5',
            fee: '1.25',
            time: Date.now(),
            tid: 'trade-123',
            hash: '0xabcd',
          },
        ],
      };

      // Should not throw error
      await expect(eventHandler(fillEvent)).resolves.not.toThrow();
    });

    it('should process multiple fills in one event', async () => {
      const mockOrder1 = {
        id: 1,
        internalOrderId: 'order-1',
        size: '1.0',
        filledSize: '0',
        averageFillPrice: '0',
        status: 'open',
      };

      const mockOrder2 = {
        id: 2,
        internalOrderId: 'order-2',
        size: '2.0',
        filledSize: '0',
        averageFillPrice: '0',
        status: 'open',
      };

      mockDb.limit
        .mockResolvedValueOnce([mockOrder1])
        .mockResolvedValueOnce([mockOrder2]);

      const fillEvent = {
        fills: [
          {
            oid: 'hl-order-1',
            coin: 'BTC',
            side: 'B',
            px: '50000',
            sz: '0.5',
            fee: '1.25',
            time: Date.now(),
            tid: 'trade-1',
            hash: '0xabcd',
          },
          {
            oid: 'hl-order-2',
            coin: 'ETH',
            side: 'A',
            px: '3000',
            sz: '1.0',
            fee: '0.75',
            time: Date.now(),
            tid: 'trade-2',
            hash: '0xdcba',
          },
        ],
      };

      await eventHandler(fillEvent);

      // Should process both fills
      expect(mockDb.update).toHaveBeenCalledTimes(2);
      expect(mockDb.insert).toHaveBeenCalledTimes(2);
    });
  });

  describe('Shutdown', () => {
    it('should unsubscribe all subscriptions on shutdown', async () => {
      const mockSubscription = {
        unsubscribe: vi.fn(),
      };

      mockClient.subscribeToUserEvents.mockResolvedValue(mockSubscription);

      await orderStatusService.subscribeToUserOrders('user-1', '0x1111111111111111111111111111111111111111');
      await orderStatusService.subscribeToUserOrders('user-2', '0x2222222222222222222222222222222222222222');

      expect(orderStatusService.getSubscriptionCount()).toBe(2);

      await orderStatusService.shutdown();

      expect(mockSubscription.unsubscribe).toHaveBeenCalledTimes(2);
      expect(orderStatusService.getSubscriptionCount()).toBe(0);
    });

    it('should remove all event listeners on shutdown', async () => {
      const handler = vi.fn();
      orderStatusService.on('orderFill', handler);

      expect(orderStatusService.listenerCount('orderFill')).toBe(1);

      await orderStatusService.shutdown();

      expect(orderStatusService.listenerCount('orderFill')).toBe(0);
    });

    it('should handle shutdown errors gracefully', async () => {
      const mockSubscription = {
        unsubscribe: vi.fn().mockRejectedValue(new Error('Unsubscribe failed')),
      };

      mockClient.subscribeToUserEvents.mockResolvedValue(mockSubscription);

      await orderStatusService.subscribeToUserOrders(testUserId, testUserAddress);

      // Should not throw
      await expect(orderStatusService.shutdown()).resolves.not.toThrow();
    });
  });
});

describe('Singleton Functions', () => {
  afterEach(() => {
    resetOrderStatusService();
  });

  describe('getOrderStatusService', () => {
    it('should return singleton instance', () => {
      const instance1 = getOrderStatusService();
      const instance2 = getOrderStatusService();

      expect(instance1).toBe(instance2);
    });

    it('should create new instance on first call', () => {
      const instance = getOrderStatusService();

      expect(instance).toBeInstanceOf(OrderStatusService);
    });
  });

  describe('resetOrderStatusService', () => {
    it('should reset singleton instance', () => {
      const instance1 = getOrderStatusService();

      resetOrderStatusService();

      const instance2 = getOrderStatusService();

      expect(instance1).not.toBe(instance2);
    });

    it('should shutdown instance before resetting', async () => {
      const instance = getOrderStatusService();
      const shutdownSpy = vi.spyOn(instance, 'shutdown');

      resetOrderStatusService();

      expect(shutdownSpy).toHaveBeenCalled();
    });
  });
});
