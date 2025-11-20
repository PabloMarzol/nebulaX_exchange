import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RateLimiter, createRateLimiter } from '../services/hyperliquid/RateLimiter';

describe('RateLimiter', () => {
  let rateLimiter: RateLimiter;

  beforeEach(() => {
    rateLimiter = createRateLimiter('test-limiter', {
      requestsPerSecond: 10,
      burstCapacity: 10,
      maxQueueSize: 20,
    });
  });

  afterEach(() => {
    rateLimiter.shutdown();
  });

  describe('Initial State', () => {
    it('should start with full token bucket', () => {
      const stats = rateLimiter.getStats();
      expect(stats.availableTokens).toBe(10); // burst capacity
      expect(stats.queuedRequests).toBe(0);
      expect(stats.totalRequests).toBe(0);
    });

    it('should have zero throttled and rejected requests', () => {
      const stats = rateLimiter.getStats();
      expect(stats.totalThrottled).toBe(0);
      expect(stats.totalRejected).toBe(0);
    });
  });

  describe('Immediate Token Consumption', () => {
    it('should allow immediate execution when tokens available', async () => {
      await rateLimiter.acquire(1);

      const stats = rateLimiter.getStats();
      expect(stats.availableTokens).toBe(9); // 10 - 1
      expect(stats.totalRequests).toBe(1);
      expect(stats.totalThrottled).toBe(0);
    });

    it('should consume multiple tokens at once', async () => {
      await rateLimiter.acquire(3);

      const stats = rateLimiter.getStats();
      expect(stats.availableTokens).toBe(7); // 10 - 3
      expect(stats.totalRequests).toBe(1);
    });

    it('should allow multiple sequential acquires', async () => {
      await rateLimiter.acquire(1);
      await rateLimiter.acquire(1);
      await rateLimiter.acquire(1);

      const stats = rateLimiter.getStats();
      expect(stats.availableTokens).toBe(7); // 10 - 3
      expect(stats.totalRequests).toBe(3);
    });

    it('should consume all available tokens', async () => {
      await rateLimiter.acquire(10);

      const stats = rateLimiter.getStats();
      expect(stats.availableTokens).toBe(0);
      expect(stats.totalRequests).toBe(1);
    });
  });

  describe('Request Queuing', () => {
    it('should queue requests when tokens exhausted', async () => {
      // Consume all tokens
      await rateLimiter.acquire(10);

      // This should queue
      const promise = rateLimiter.acquire(1);

      // Check stats immediately (request should be queued)
      const stats = rateLimiter.getStats();
      expect(stats.queuedRequests).toBe(1);
      expect(stats.totalThrottled).toBe(1);

      // Wait for refill and resolution
      await promise;
    });

    it('should queue multiple requests', async () => {
      // Consume all tokens
      await rateLimiter.acquire(10);

      // Queue 3 requests
      const promises = [
        rateLimiter.acquire(1),
        rateLimiter.acquire(1),
        rateLimiter.acquire(1),
      ];

      const stats = rateLimiter.getStats();
      expect(stats.queuedRequests).toBe(3);
      expect(stats.totalThrottled).toBe(3);

      // Wait for all to complete
      await Promise.all(promises);
    });

    it('should process queue as tokens refill', async () => {
      // Consume all tokens
      await rateLimiter.acquire(10);

      // Queue a request
      const promise = rateLimiter.acquire(1);

      // Wait for refill (tokens refill every 100ms)
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Request should complete
      await promise;

      const stats = rateLimiter.getStats();
      expect(stats.queuedRequests).toBe(0);
    }, 10000);

    it('should process queue in FIFO order', async () => {
      // Consume all tokens
      await rateLimiter.acquire(10);

      const results: number[] = [];

      // Queue 3 requests
      rateLimiter.acquire(1).then(() => results.push(1));
      rateLimiter.acquire(1).then(() => results.push(2));
      rateLimiter.acquire(1).then(() => results.push(3));

      // Wait for all to process
      await new Promise((resolve) => setTimeout(resolve, 500));

      expect(results).toEqual([1, 2, 3]);
    }, 10000);
  });

  describe('Queue Limits', () => {
    it('should reject requests when queue is full', async () => {
      const limiter = createRateLimiter('small-queue', {
        requestsPerSecond: 1,
        burstCapacity: 1,
        maxQueueSize: 2,
      });

      try {
        // Consume all tokens
        await limiter.acquire(1);

        // Queue 2 requests (max queue size) - catch rejections to avoid unhandled errors
        const promise1 = limiter.acquire(1).catch(() => {});
        const promise2 = limiter.acquire(1).catch(() => {});

        // This should be rejected
        await expect(limiter.acquire(1)).rejects.toThrow('Queue full');

        const stats = limiter.getStats();
        expect(stats.totalRejected).toBe(1);

        // Clean up queued promises
        await Promise.allSettled([promise1, promise2]);
      } finally {
        limiter.shutdown();
      }
    });

    it('should track rejected requests', async () => {
      const limiter = createRateLimiter('reject-test', {
        requestsPerSecond: 1,
        burstCapacity: 1,
        maxQueueSize: 1,
      });

      try {
        await limiter.acquire(1);
        const queuedPromise = limiter.acquire(1).catch(() => {}); // queued - catch rejection

        // These should be rejected
        try {
          await limiter.acquire(1);
        } catch {}
        try {
          await limiter.acquire(1);
        } catch {}

        const stats = limiter.getStats();
        expect(stats.totalRejected).toBe(2);

        // Clean up queued promise
        await queuedPromise;
      } finally {
        limiter.shutdown();
      }
    });
  });

  describe('Token Refill', () => {
    it('should refill tokens over time', async () => {
      // Consume some tokens
      await rateLimiter.acquire(5);

      const stats1 = rateLimiter.getStats();
      expect(stats1.availableTokens).toBe(5);

      // Wait for refill (100ms refill interval)
      await new Promise((resolve) => setTimeout(resolve, 200));

      const stats2 = rateLimiter.getStats();
      expect(stats2.availableTokens).toBeGreaterThan(5);
    }, 10000);

    it('should not exceed burst capacity', async () => {
      // Start with full tokens
      const stats1 = rateLimiter.getStats();
      expect(stats1.availableTokens).toBe(10);

      // Wait for refill attempts
      await new Promise((resolve) => setTimeout(resolve, 300));

      const stats2 = rateLimiter.getStats();
      // Should still be capped at burst capacity
      expect(stats2.availableTokens).toBeLessThanOrEqual(10);
    }, 10000);

    it('should refill at correct rate', async () => {
      const limiter = createRateLimiter('rate-test', {
        requestsPerSecond: 10, // 10 tokens per second
        burstCapacity: 10,
      });

      try {
        // Consume all tokens
        await limiter.acquire(10);

        // Wait 100ms (should refill ~1 token at 10/sec rate)
        await new Promise((resolve) => setTimeout(resolve, 150));

        const stats = limiter.getStats();
        // Should have approximately 1 token (allow some margin)
        expect(stats.availableTokens).toBeGreaterThanOrEqual(1);
        expect(stats.availableTokens).toBeLessThanOrEqual(2);
      } finally {
        limiter.shutdown();
      }
    }, 10000);
  });

  describe('Burst Capacity', () => {
    it('should allow burst up to capacity', async () => {
      const limiter = createRateLimiter('burst-test', {
        requestsPerSecond: 5,
        burstCapacity: 15,
      });

      try {
        // Should allow 15 immediate requests
        await limiter.acquire(15);

        const stats = limiter.getStats();
        expect(stats.availableTokens).toBe(0);
        expect(stats.totalThrottled).toBe(0);
      } finally {
        limiter.shutdown();
      }
    });

    it('should throttle after burst is exhausted', async () => {
      const limiter = createRateLimiter('burst-throttle', {
        requestsPerSecond: 5,
        burstCapacity: 10,
      });

      try {
        // Consume burst capacity
        await limiter.acquire(10);

        // This should queue
        const promise = limiter.acquire(1);

        const stats = limiter.getStats();
        expect(stats.totalThrottled).toBe(1);

        await promise;
      } finally {
        limiter.shutdown();
      }
    });
  });

  describe('Execute Method', () => {
    it('should execute function after acquiring token', async () => {
      const mockFn = vi.fn().mockResolvedValue('result');

      const result = await rateLimiter.execute(mockFn);

      expect(result).toBe('result');
      expect(mockFn).toHaveBeenCalledOnce();

      const stats = rateLimiter.getStats();
      expect(stats.totalRequests).toBe(1);
    });

    it('should execute multiple functions in sequence', async () => {
      const mockFn1 = vi.fn().mockResolvedValue('result1');
      const mockFn2 = vi.fn().mockResolvedValue('result2');

      const result1 = await rateLimiter.execute(mockFn1);
      const result2 = await rateLimiter.execute(mockFn2);

      expect(result1).toBe('result1');
      expect(result2).toBe('result2');
      expect(mockFn1).toHaveBeenCalled();
      expect(mockFn2).toHaveBeenCalled();
    });

    it('should propagate function errors', async () => {
      const mockFn = vi.fn().mockRejectedValue(new Error('Function failed'));

      await expect(rateLimiter.execute(mockFn)).rejects.toThrow('Function failed');
    });

    it('should consume custom token amount', async () => {
      const mockFn = vi.fn().mockResolvedValue('result');

      await rateLimiter.execute(mockFn, 3);

      const stats = rateLimiter.getStats();
      expect(stats.availableTokens).toBe(7); // 10 - 3
    });
  });

  describe('Statistics', () => {
    it('should track total requests', async () => {
      await rateLimiter.acquire(1);
      await rateLimiter.acquire(1);
      await rateLimiter.acquire(1);

      const stats = rateLimiter.getStats();
      expect(stats.totalRequests).toBe(3);
    });

    it('should track throttled requests', async () => {
      // Exhaust tokens
      await rateLimiter.acquire(10);

      // Queue 2 requests
      rateLimiter.acquire(1);
      rateLimiter.acquire(1);

      const stats = rateLimiter.getStats();
      expect(stats.totalThrottled).toBe(2);
    });

    it('should reset statistics', async () => {
      await rateLimiter.acquire(5);

      let stats = rateLimiter.getStats();
      expect(stats.totalRequests).toBe(1);

      rateLimiter.resetStats();

      stats = rateLimiter.getStats();
      expect(stats.totalRequests).toBe(0);
      expect(stats.totalThrottled).toBe(0);
      expect(stats.totalRejected).toBe(0);
    });

    it('should not reset token count when resetting stats', async () => {
      await rateLimiter.acquire(5);

      const stats1 = rateLimiter.getStats();
      expect(stats1.availableTokens).toBe(5);

      rateLimiter.resetStats();

      const stats2 = rateLimiter.getStats();
      expect(stats2.availableTokens).toBe(5); // Should remain unchanged
    });
  });

  describe('Queue Management', () => {
    it('should clear all queued requests', async () => {
      // Exhaust tokens
      await rateLimiter.acquire(10);

      // Queue 3 requests
      const promise1 = rateLimiter.acquire(1);
      const promise2 = rateLimiter.acquire(1);
      const promise3 = rateLimiter.acquire(1);

      const stats1 = rateLimiter.getStats();
      expect(stats1.queuedRequests).toBe(3);

      // Clear queue
      rateLimiter.clearQueue();

      const stats2 = rateLimiter.getStats();
      expect(stats2.queuedRequests).toBe(0);

      // Promises should reject
      await expect(promise1).rejects.toThrow('Queue cleared');
      await expect(promise2).rejects.toThrow('Queue cleared');
      await expect(promise3).rejects.toThrow('Queue cleared');
    });

    it('should reject cleared requests with error', async () => {
      await rateLimiter.acquire(10);

      const promise = rateLimiter.acquire(1);

      rateLimiter.clearQueue();

      try {
        await promise;
        expect.fail('Should have thrown error');
      } catch (error: any) {
        expect(error.message).toContain('Queue cleared');
      }
    });
  });

  describe('Shutdown', () => {
    it('should shutdown and clear queue', async () => {
      // Exhaust tokens
      await rateLimiter.acquire(10);

      // Queue requests
      const promise1 = rateLimiter.acquire(1);
      const promise2 = rateLimiter.acquire(1);

      // Shutdown
      rateLimiter.shutdown();

      // Promises should reject
      await expect(promise1).rejects.toThrow('Queue cleared');
      await expect(promise2).rejects.toThrow('Queue cleared');
    });

    it('should stop token refill after shutdown', async () => {
      // Consume tokens
      await rateLimiter.acquire(5);

      const stats1 = rateLimiter.getStats();
      const tokens1 = stats1.availableTokens;

      rateLimiter.shutdown();

      // Wait
      await new Promise((resolve) => setTimeout(resolve, 200));

      const stats2 = rateLimiter.getStats();
      // Tokens should not have refilled after shutdown
      expect(stats2.availableTokens).toBe(tokens1);
    }, 10000);
  });

  describe('Concurrent Requests', () => {
    it('should handle concurrent acquire calls', async () => {
      const promises = [];

      // Launch 5 concurrent requests
      for (let i = 0; i < 5; i++) {
        promises.push(rateLimiter.acquire(1));
      }

      await Promise.all(promises);

      const stats = rateLimiter.getStats();
      expect(stats.totalRequests).toBe(5);
      expect(stats.availableTokens).toBe(5); // 10 - 5
    });

    it('should handle concurrent execute calls', async () => {
      const mockFn = vi.fn().mockResolvedValue('result');
      const promises = [];

      for (let i = 0; i < 10; i++) {
        promises.push(rateLimiter.execute(mockFn));
      }

      const results = await Promise.all(promises);

      expect(results).toHaveLength(10);
      expect(mockFn).toHaveBeenCalledTimes(10);
    });

    it('should queue excess concurrent requests', async () => {
      const limiter = createRateLimiter('concurrent-test', {
        requestsPerSecond: 5,
        burstCapacity: 5,
        maxQueueSize: 50,
      });

      try {
        const promises = [];

        // Launch 15 requests (5 immediate, 10 queued)
        for (let i = 0; i < 15; i++) {
          promises.push(limiter.acquire(1));
        }

        // Check stats before waiting
        const stats = limiter.getStats();
        expect(stats.queuedRequests).toBe(10);
        expect(stats.totalThrottled).toBe(10);

        // Wait for all to complete
        await Promise.all(promises);

        const finalStats = limiter.getStats();
        expect(finalStats.queuedRequests).toBe(0);
        expect(finalStats.totalRequests).toBe(15);
      } finally {
        limiter.shutdown();
      }
    }, 10000);
  });
});

describe('createRateLimiter', () => {
  let limiter: RateLimiter;

  afterEach(() => {
    if (limiter) {
      limiter.shutdown();
    }
  });

  it('should create limiter with default config', () => {
    limiter = createRateLimiter('test');

    const stats = limiter.getStats();
    expect(stats.availableTokens).toBe(20); // default burst capacity
  });

  it('should create limiter with custom config', () => {
    limiter = createRateLimiter('test', {
      requestsPerSecond: 5,
      burstCapacity: 10,
    });

    const stats = limiter.getStats();
    expect(stats.availableTokens).toBe(10);
  });

  it('should merge custom config with defaults', () => {
    limiter = createRateLimiter('test', {
      requestsPerSecond: 15,
      // Other values should use defaults
    });

    const stats = limiter.getStats();
    // Should use default burst capacity (20)
    expect(stats.availableTokens).toBe(20);
  });

  it('should create limiter with custom name', () => {
    limiter = createRateLimiter('my-custom-limiter', {
      requestsPerSecond: 10,
    });

    // Limiter should function normally
    const stats = limiter.getStats();
    expect(stats).toBeDefined();
  });
});
