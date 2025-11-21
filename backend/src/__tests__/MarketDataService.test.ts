import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  MarketDataService,
  getMarketDataService,
  resetMarketDataService,
} from '../services/hyperliquid/MarketDataService';

// Mock dependencies
vi.mock('../services/hyperliquid/HyperliquidClient', () => ({
  getHyperliquidClient: vi.fn(() => mockClient),
}));

// Mock client
const mockClient = {
  subscribeToOrderbook: vi.fn(),
  subscribeToTrades: vi.fn(),
  subscribeToCandles: vi.fn(),
  subscribeToAllMids: vi.fn(),
  subscribeToUserEvents: vi.fn(),
};

describe('MarketDataService', () => {
  let marketDataService: MarketDataService;

  beforeEach(() => {
    marketDataService = new MarketDataService();
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await marketDataService.unsubscribeAll();
  });

  describe('Initialization', () => {
    it('should initialize successfully', () => {
      expect(marketDataService).toBeInstanceOf(MarketDataService);
    });

    it('should be an event emitter', () => {
      expect(marketDataService.on).toBeDefined();
      expect(marketDataService.emit).toBeDefined();
    });

    it('should have zero active subscriptions initially', () => {
      const subscriptions = marketDataService.getActiveSubscriptions();
      expect(subscriptions).toHaveLength(0);
    });
  });

  describe('Orderbook Subscriptions', () => {
    it('should subscribe to orderbook', async () => {
      const mockUnsubscribe = vi.fn().mockResolvedValue(undefined);
      mockClient.subscribeToOrderbook.mockResolvedValueOnce(mockUnsubscribe);

      await marketDataService.subscribeToOrderbook('BTC');

      expect(mockClient.subscribeToOrderbook).toHaveBeenCalledWith(
        'BTC',
        expect.any(Function)
      );

      const subscriptions = marketDataService.getActiveSubscriptions();
      expect(subscriptions).toHaveLength(1);
      expect(subscriptions[0].type).toBe('orderbook');
      expect(subscriptions[0].symbol).toBe('BTC');
    });

    it('should reuse existing subscription for same symbol', async () => {
      const mockUnsubscribe = vi.fn().mockResolvedValue(undefined);
      mockClient.subscribeToOrderbook.mockResolvedValue(mockUnsubscribe);

      await marketDataService.subscribeToOrderbook('BTC');
      await marketDataService.subscribeToOrderbook('BTC');

      // Should only subscribe once
      expect(mockClient.subscribeToOrderbook).toHaveBeenCalledTimes(1);

      const subscriptions = marketDataService.getActiveSubscriptions();
      expect(subscriptions).toHaveLength(1);
      expect(subscriptions[0].subscriberCount).toBe(2);
    });

    it('should emit orderbook events', async () => {
      let orderbookHandler: Function;
      const mockUnsubscribe = vi.fn().mockResolvedValue(undefined);

      mockClient.subscribeToOrderbook.mockImplementationOnce((symbol, handler) => {
        orderbookHandler = handler;
        return Promise.resolve(mockUnsubscribe);
      });

      await marketDataService.subscribeToOrderbook('BTC');

      const eventHandler = vi.fn();
      marketDataService.on('orderbook', eventHandler);

      const mockData = {
        coin: 'BTC',
        time: Date.now(),
        levels: [
          [['50000', '1.0']], // bids
          [['51000', '1.0']], // asks
        ],
      };

      orderbookHandler!(mockData);

      expect(eventHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          symbol: 'BTC',
          data: mockData,
        })
      );
    });

    it('should unsubscribe from orderbook', async () => {
      const mockUnsubscribe = vi.fn().mockResolvedValue(undefined);
      mockClient.subscribeToOrderbook.mockResolvedValue(mockUnsubscribe);

      await marketDataService.subscribeToOrderbook('BTC');
      await marketDataService.unsubscribeFromOrderbook('BTC');

      expect(mockUnsubscribe).toHaveBeenCalled();

      const subscriptions = marketDataService.getActiveSubscriptions();
      expect(subscriptions).toHaveLength(0);
    });

    it('should only unsubscribe when subscriber count reaches zero', async () => {
      const mockUnsubscribe = vi.fn().mockResolvedValue(undefined);
      mockClient.subscribeToOrderbook.mockResolvedValue(mockUnsubscribe);

      await marketDataService.subscribeToOrderbook('BTC');
      await marketDataService.subscribeToOrderbook('BTC');

      await marketDataService.unsubscribeFromOrderbook('BTC');

      // Should not unsubscribe yet (still 1 subscriber)
      expect(mockUnsubscribe).not.toHaveBeenCalled();

      const subscriptions = marketDataService.getActiveSubscriptions();
      expect(subscriptions).toHaveLength(1);
      expect(subscriptions[0].subscriberCount).toBe(1);

      await marketDataService.unsubscribeFromOrderbook('BTC');

      // Now should unsubscribe
      expect(mockUnsubscribe).toHaveBeenCalled();
    });

    it('should handle subscription errors', async () => {
      mockClient.subscribeToOrderbook.mockRejectedValueOnce(
        new Error('WebSocket connection failed')
      );

      await expect(
        marketDataService.subscribeToOrderbook('BTC')
      ).rejects.toThrow('WebSocket connection failed');
    });
  });

  describe('Trades Subscriptions', () => {
    it('should subscribe to trades', async () => {
      const mockUnsubscribe = vi.fn().mockResolvedValue(undefined);
      mockClient.subscribeToTrades.mockResolvedValueOnce(mockUnsubscribe);

      await marketDataService.subscribeToTrades('BTC');

      expect(mockClient.subscribeToTrades).toHaveBeenCalledWith(
        'BTC',
        expect.any(Function)
      );

      const subscriptions = marketDataService.getActiveSubscriptions();
      expect(subscriptions).toHaveLength(1);
      expect(subscriptions[0].type).toBe('trades');
    });

    it('should reuse existing trades subscription', async () => {
      const mockUnsubscribe = vi.fn().mockResolvedValue(undefined);
      mockClient.subscribeToTrades.mockResolvedValue(mockUnsubscribe);

      await marketDataService.subscribeToTrades('BTC');
      await marketDataService.subscribeToTrades('BTC');

      expect(mockClient.subscribeToTrades).toHaveBeenCalledTimes(1);

      const subscriptions = marketDataService.getActiveSubscriptions();
      expect(subscriptions[0].subscriberCount).toBe(2);
    });

    it('should emit trade events', async () => {
      let tradesHandler: Function;
      const mockUnsubscribe = vi.fn().mockResolvedValue(undefined);

      mockClient.subscribeToTrades.mockImplementationOnce((symbol, handler) => {
        tradesHandler = handler;
        return Promise.resolve(mockUnsubscribe);
      });

      await marketDataService.subscribeToTrades('BTC');

      const eventHandler = vi.fn();
      marketDataService.on('trades', eventHandler);

      const mockTrades = [
        {
          coin: 'BTC',
          side: 'B',
          px: '50000',
          sz: '0.5',
          time: Date.now(),
        },
      ];

      tradesHandler!(mockTrades);

      expect(eventHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          symbol: 'BTC',
          data: mockTrades,
        })
      );
    });

    it('should unsubscribe from trades', async () => {
      const mockUnsubscribe = vi.fn().mockResolvedValue(undefined);
      mockClient.subscribeToTrades.mockResolvedValue(mockUnsubscribe);

      await marketDataService.subscribeToTrades('BTC');
      await marketDataService.unsubscribeFromTrades('BTC');

      expect(mockUnsubscribe).toHaveBeenCalled();
    });
  });

  describe('Candles Subscriptions', () => {
    it('should subscribe to candles', async () => {
      const mockUnsubscribe = vi.fn().mockResolvedValue(undefined);
      mockClient.subscribeToCandles.mockResolvedValueOnce(mockUnsubscribe);

      await marketDataService.subscribeToCandles('BTC', '1m');

      expect(mockClient.subscribeToCandles).toHaveBeenCalledWith(
        'BTC',
        '1m',
        expect.any(Function)
      );

      const subscriptions = marketDataService.getActiveSubscriptions();
      expect(subscriptions).toHaveLength(1);
      expect(subscriptions[0].type).toBe('candles');
      expect(subscriptions[0].symbol).toBe('BTC');
      expect(subscriptions[0].interval).toBe('1m');
    });

    it('should maintain separate subscriptions for different intervals', async () => {
      const mockUnsubscribe = vi.fn().mockResolvedValue(undefined);
      mockClient.subscribeToCandles.mockResolvedValue(mockUnsubscribe);

      await marketDataService.subscribeToCandles('BTC', '1m');
      await marketDataService.subscribeToCandles('BTC', '5m');

      // Should have 2 separate subscriptions
      expect(mockClient.subscribeToCandles).toHaveBeenCalledTimes(2);

      const subscriptions = marketDataService.getActiveSubscriptions();
      expect(subscriptions).toHaveLength(2);
    });

    it('should emit candle events', async () => {
      let candleHandler: Function;
      const mockUnsubscribe = vi.fn().mockResolvedValue(undefined);

      mockClient.subscribeToCandles.mockImplementationOnce((symbol, interval, handler) => {
        candleHandler = handler;
        return Promise.resolve(mockUnsubscribe);
      });

      await marketDataService.subscribeToCandles('BTC', '1m');

      const eventHandler = vi.fn();
      marketDataService.on('candles', eventHandler);

      const mockCandle = {
        coin: 'BTC',
        interval: '1m',
        time: Date.now(),
        open: '50000',
        high: '51000',
        low: '49000',
        close: '50500',
        volume: '100',
      };

      candleHandler!(mockCandle);

      expect(eventHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          symbol: 'BTC',
          interval: '1m',
          data: mockCandle,
        })
      );
    });

    it('should unsubscribe from candles', async () => {
      const mockUnsubscribe = vi.fn().mockResolvedValue(undefined);
      mockClient.subscribeToCandles.mockResolvedValue(mockUnsubscribe);

      await marketDataService.subscribeToCandles('BTC', '1m');
      await marketDataService.unsubscribeFromCandles('BTC', '1m');

      expect(mockUnsubscribe).toHaveBeenCalled();
    });
  });

  describe('All Mids Subscriptions', () => {
    it('should subscribe to all mids', async () => {
      const mockUnsubscribe = vi.fn().mockResolvedValue(undefined);
      mockClient.subscribeToAllMids.mockResolvedValueOnce(mockUnsubscribe);

      await marketDataService.subscribeToAllMids();

      expect(mockClient.subscribeToAllMids).toHaveBeenCalledWith(
        expect.any(Function)
      );

      const subscriptions = marketDataService.getActiveSubscriptions();
      expect(subscriptions).toHaveLength(1);
      expect(subscriptions[0].type).toBe('allMids');
    });

    it('should reuse existing allMids subscription', async () => {
      const mockUnsubscribe = vi.fn().mockResolvedValue(undefined);
      mockClient.subscribeToAllMids.mockResolvedValue(mockUnsubscribe);

      await marketDataService.subscribeToAllMids();
      await marketDataService.subscribeToAllMids();

      expect(mockClient.subscribeToAllMids).toHaveBeenCalledTimes(1);

      const subscriptions = marketDataService.getActiveSubscriptions();
      expect(subscriptions[0].subscriberCount).toBe(2);
    });

    it('should emit allMids events', async () => {
      let midsHandler: Function;
      const mockUnsubscribe = vi.fn().mockResolvedValue(undefined);

      mockClient.subscribeToAllMids.mockImplementationOnce((handler) => {
        midsHandler = handler;
        return Promise.resolve(mockUnsubscribe);
      });

      await marketDataService.subscribeToAllMids();

      const eventHandler = vi.fn();
      marketDataService.on('allMids', eventHandler);

      const mockMids = {
        BTC: '50000',
        ETH: '3000',
        SOL: '100',
      };

      midsHandler!(mockMids);

      expect(eventHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          data: mockMids,
        })
      );
    });

    it('should unsubscribe from all mids', async () => {
      const mockUnsubscribe = vi.fn().mockResolvedValue(undefined);
      mockClient.subscribeToAllMids.mockResolvedValue(mockUnsubscribe);

      await marketDataService.subscribeToAllMids();
      await marketDataService.unsubscribeFromAllMids();

      expect(mockUnsubscribe).toHaveBeenCalled();
    });
  });

  describe('User Events Subscriptions', () => {
    const testUserAddress = '0x1234567890123456789012345678901234567890';

    it('should subscribe to user events', async () => {
      const mockUnsubscribe = vi.fn().mockResolvedValue(undefined);
      mockClient.subscribeToUserEvents.mockResolvedValueOnce(mockUnsubscribe);

      await marketDataService.subscribeToUserEvents(testUserAddress);

      expect(mockClient.subscribeToUserEvents).toHaveBeenCalledWith(
        testUserAddress,
        expect.any(Function)
      );

      const subscriptions = marketDataService.getActiveSubscriptions();
      expect(subscriptions).toHaveLength(1);
      expect(subscriptions[0].type).toBe('userEvents');
      expect(subscriptions[0].userAddress).toBe(testUserAddress);
    });

    it('should reuse existing user events subscription', async () => {
      const mockUnsubscribe = vi.fn().mockResolvedValue(undefined);
      mockClient.subscribeToUserEvents.mockResolvedValue(mockUnsubscribe);

      await marketDataService.subscribeToUserEvents(testUserAddress);
      await marketDataService.subscribeToUserEvents(testUserAddress);

      expect(mockClient.subscribeToUserEvents).toHaveBeenCalledTimes(1);

      const subscriptions = marketDataService.getActiveSubscriptions();
      expect(subscriptions[0].subscriberCount).toBe(2);
    });

    it('should emit user events', async () => {
      let userEventsHandler: Function;
      const mockUnsubscribe = vi.fn().mockResolvedValue(undefined);

      mockClient.subscribeToUserEvents.mockImplementationOnce((address, handler) => {
        userEventsHandler = handler;
        return Promise.resolve(mockUnsubscribe);
      });

      await marketDataService.subscribeToUserEvents(testUserAddress);

      const eventHandler = vi.fn();
      marketDataService.on('userEvents', eventHandler);

      const mockEvent = {
        fills: [
          {
            oid: 'order-123',
            coin: 'BTC',
            side: 'B',
            px: '50000',
            sz: '0.5',
          },
        ],
      };

      userEventsHandler!(mockEvent);

      expect(eventHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          userAddress: testUserAddress,
          data: mockEvent,
        })
      );
    });

    it('should unsubscribe from user events', async () => {
      const mockUnsubscribe = vi.fn().mockResolvedValue(undefined);
      mockClient.subscribeToUserEvents.mockResolvedValue(mockUnsubscribe);

      await marketDataService.subscribeToUserEvents(testUserAddress);
      await marketDataService.unsubscribeFromUserEvents(testUserAddress);

      expect(mockUnsubscribe).toHaveBeenCalled();
    });
  });

  describe('Multiple Subscriptions', () => {
    it('should handle multiple different subscriptions', async () => {
      const mockUnsubscribe = vi.fn().mockResolvedValue(undefined);

      mockClient.subscribeToOrderbook.mockResolvedValue(mockUnsubscribe);
      mockClient.subscribeToTrades.mockResolvedValue(mockUnsubscribe);
      mockClient.subscribeToCandles.mockResolvedValue(mockUnsubscribe);

      await marketDataService.subscribeToOrderbook('BTC');
      await marketDataService.subscribeToTrades('ETH');
      await marketDataService.subscribeToCandles('SOL', '1m');

      const subscriptions = marketDataService.getActiveSubscriptions();
      expect(subscriptions).toHaveLength(3);

      const types = subscriptions.map((s) => s.type);
      expect(types).toContain('orderbook');
      expect(types).toContain('trades');
      expect(types).toContain('candles');
    });

    it('should track different symbols separately', async () => {
      const mockUnsubscribe = vi.fn().mockResolvedValue(undefined);
      mockClient.subscribeToOrderbook.mockResolvedValue(mockUnsubscribe);

      await marketDataService.subscribeToOrderbook('BTC');
      await marketDataService.subscribeToOrderbook('ETH');

      const subscriptions = marketDataService.getActiveSubscriptions();
      expect(subscriptions).toHaveLength(2);

      const symbols = subscriptions.map((s) => s.symbol);
      expect(symbols).toContain('BTC');
      expect(symbols).toContain('ETH');
    });
  });

  describe('Subscription Timestamp Updates', () => {
    it('should update timestamp on data receipt', async () => {
      let orderbookHandler: Function;
      const mockUnsubscribe = vi.fn().mockResolvedValue(undefined);

      mockClient.subscribeToOrderbook.mockImplementationOnce((symbol, handler) => {
        orderbookHandler = handler;
        return Promise.resolve(mockUnsubscribe);
      });

      await marketDataService.subscribeToOrderbook('BTC');

      const subscriptions1 = marketDataService.getActiveSubscriptions();
      const timestamp1 = subscriptions1[0].lastUpdate;

      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Trigger data update
      orderbookHandler!({
        coin: 'BTC',
        time: Date.now(),
        levels: [[['50000', '1.0']], [['51000', '1.0']]],
      });

      const subscriptions2 = marketDataService.getActiveSubscriptions();
      const timestamp2 = subscriptions2[0].lastUpdate;

      expect(timestamp2.getTime()).toBeGreaterThan(timestamp1.getTime());
    });
  });

  describe('Stale Subscription Cleanup', () => {
    it('should clean up stale subscriptions', async () => {
      const mockUnsubscribe = vi.fn().mockResolvedValue(undefined);
      mockClient.subscribeToOrderbook.mockResolvedValue(mockUnsubscribe);

      await marketDataService.subscribeToOrderbook('BTC');

      // Manually set lastUpdate to old timestamp
      const subscriptions = marketDataService.getActiveSubscriptions();
      const key = 'orderbook:BTC';
      const subscription = (marketDataService as any).subscriptions.get(key);
      subscription.lastUpdate = new Date(Date.now() - 400000); // 400 seconds ago

      const cleanedCount = await marketDataService.cleanupStaleSubscriptions(300000);

      expect(cleanedCount).toBe(1);
      expect(mockUnsubscribe).toHaveBeenCalled();

      const remainingSubscriptions = marketDataService.getActiveSubscriptions();
      expect(remainingSubscriptions).toHaveLength(0);
    });

    it('should not clean up recent subscriptions', async () => {
      const mockUnsubscribe = vi.fn().mockResolvedValue(undefined);
      mockClient.subscribeToOrderbook.mockResolvedValue(mockUnsubscribe);

      await marketDataService.subscribeToOrderbook('BTC');

      const cleanedCount = await marketDataService.cleanupStaleSubscriptions(300000);

      expect(cleanedCount).toBe(0);
      expect(mockUnsubscribe).not.toHaveBeenCalled();

      const subscriptions = marketDataService.getActiveSubscriptions();
      expect(subscriptions).toHaveLength(1);
    });
  });

  describe('Unsubscribe All', () => {
    it('should unsubscribe from all active subscriptions', async () => {
      const mockUnsubscribe = vi.fn().mockResolvedValue(undefined);

      mockClient.subscribeToOrderbook.mockResolvedValue(mockUnsubscribe);
      mockClient.subscribeToTrades.mockResolvedValue(mockUnsubscribe);

      await marketDataService.subscribeToOrderbook('BTC');
      await marketDataService.subscribeToTrades('ETH');

      await marketDataService.unsubscribeAll();

      expect(mockUnsubscribe).toHaveBeenCalledTimes(2);

      const subscriptions = marketDataService.getActiveSubscriptions();
      expect(subscriptions).toHaveLength(0);
    });

    it('should remove all event listeners', async () => {
      const mockUnsubscribe = vi.fn().mockResolvedValue(undefined);
      mockClient.subscribeToOrderbook.mockResolvedValue(mockUnsubscribe);

      await marketDataService.subscribeToOrderbook('BTC');

      const handler = vi.fn();
      marketDataService.on('orderbook', handler);

      expect(marketDataService.listenerCount('orderbook')).toBe(1);

      await marketDataService.unsubscribeAll();

      expect(marketDataService.listenerCount('orderbook')).toBe(0);
    });

    it('should handle unsubscribe errors gracefully', async () => {
      const mockUnsubscribe = vi.fn().mockRejectedValue(new Error('Unsubscribe failed'));
      mockClient.subscribeToOrderbook.mockResolvedValue(mockUnsubscribe);

      await marketDataService.subscribeToOrderbook('BTC');

      // Should not throw
      await expect(marketDataService.unsubscribeAll()).resolves.not.toThrow();
    });
  });

  describe('Statistics', () => {
    it('should provide accurate statistics', async () => {
      const mockUnsubscribe = vi.fn().mockResolvedValue(undefined);

      mockClient.subscribeToOrderbook.mockResolvedValue(mockUnsubscribe);
      mockClient.subscribeToTrades.mockResolvedValue(mockUnsubscribe);
      mockClient.subscribeToCandles.mockResolvedValue(mockUnsubscribe);

      await marketDataService.subscribeToOrderbook('BTC');
      await marketDataService.subscribeToOrderbook('BTC'); // Increment subscriber count
      await marketDataService.subscribeToTrades('ETH');
      await marketDataService.subscribeToCandles('SOL', '1m');

      const stats = marketDataService.getStats();

      expect(stats.totalSubscriptions).toBe(3);
      expect(stats.totalSubscribers).toBe(4); // 2 + 1 + 1
      expect(stats.byType.orderbook).toBe(1);
      expect(stats.byType.trades).toBe(1);
      expect(stats.byType.candles).toBe(1);
    });

    it('should handle empty subscriptions', () => {
      const stats = marketDataService.getStats();

      expect(stats.totalSubscriptions).toBe(0);
      expect(stats.totalSubscribers).toBe(0);
      expect(Object.keys(stats.byType)).toHaveLength(0);
    });
  });

  describe('Unsubscribe Edge Cases', () => {
    it('should handle unsubscribe from non-existent subscription', async () => {
      // Should not throw
      await expect(
        marketDataService.unsubscribeFromOrderbook('NONEXISTENT')
      ).resolves.not.toThrow();
    });

    it('should handle multiple unsubscribes gracefully', async () => {
      const mockUnsubscribe = vi.fn().mockResolvedValue(undefined);
      mockClient.subscribeToOrderbook.mockResolvedValue(mockUnsubscribe);

      await marketDataService.subscribeToOrderbook('BTC');
      await marketDataService.unsubscribeFromOrderbook('BTC');

      // Second unsubscribe should be handled gracefully
      await expect(
        marketDataService.unsubscribeFromOrderbook('BTC')
      ).resolves.not.toThrow();
    });
  });
});

describe('Singleton Functions', () => {
  afterEach(async () => {
    await resetMarketDataService();
  });

  describe('getMarketDataService', () => {
    it('should return singleton instance', () => {
      const instance1 = getMarketDataService();
      const instance2 = getMarketDataService();

      expect(instance1).toBe(instance2);
    });

    it('should create new instance on first call', () => {
      const instance = getMarketDataService();

      expect(instance).toBeInstanceOf(MarketDataService);
    });
  });

  describe('resetMarketDataService', () => {
    it('should reset singleton instance', async () => {
      const instance1 = getMarketDataService();

      await resetMarketDataService();

      const instance2 = getMarketDataService();

      expect(instance1).not.toBe(instance2);
    });

    it('should unsubscribe all before resetting', async () => {
      const instance = getMarketDataService();
      const unsubscribeAllSpy = vi.spyOn(instance, 'unsubscribeAll');

      await resetMarketDataService();

      expect(unsubscribeAllSpy).toHaveBeenCalled();
    });
  });
});
