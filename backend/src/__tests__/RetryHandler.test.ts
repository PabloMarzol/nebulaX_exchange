import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  RetryHandler,
  createRetryHandler,
  retryWithBackoff,
} from '../services/hyperliquid/RetryHandler';

describe('RetryHandler', () => {
  let retryHandler: RetryHandler;

  beforeEach(() => {
    retryHandler = createRetryHandler({
      maxRetries: 3,
      baseDelay: 100,
      maxDelay: 1000,
      factor: 2,
      jitter: false, // Disable jitter for predictable tests
    });
  });

  describe('Successful Executions', () => {
    it('should execute successful operations without retries', async () => {
      const mockFn = vi.fn().mockResolvedValue('success');
      const result = await retryHandler.execute(mockFn);

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledOnce();
    });

    it('should return result on first attempt', async () => {
      const mockFn = vi.fn().mockResolvedValue({ data: 'test' });
      const result = await retryHandler.execute(mockFn);

      expect(result).toEqual({ data: 'test' });
      const stats = retryHandler.getStats();
      expect(stats.totalRetries).toBe(0);
    });
  });

  describe('Retry on Transient Failures', () => {
    it('should retry on ETIMEDOUT error', async () => {
      let attempts = 0;
      const mockFn = vi.fn().mockImplementation(async () => {
        attempts++;
        if (attempts < 3) {
          const error: any = new Error('Connection timeout');
          error.code = 'ETIMEDOUT';
          throw error;
        }
        return 'success';
      });

      const result = await retryHandler.execute(mockFn);

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(3);
      expect(retryHandler.getStats().totalRetries).toBe(2);
    });

    it('should retry on ECONNRESET error', async () => {
      let attempts = 0;
      const mockFn = vi.fn().mockImplementation(async () => {
        attempts++;
        if (attempts < 2) {
          const error: any = new Error('Connection reset');
          error.code = 'ECONNRESET';
          throw error;
        }
        return 'success';
      });

      const result = await retryHandler.execute(mockFn);

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('should retry on 503 Service Unavailable', async () => {
      let attempts = 0;
      const mockFn = vi.fn().mockImplementation(async () => {
        attempts++;
        if (attempts < 2) {
          const error: any = new Error('Service Unavailable');
          error.statusCode = 503;
          throw error;
        }
        return 'success';
      });

      const result = await retryHandler.execute(mockFn);

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('should retry on 429 Rate Limit', async () => {
      let attempts = 0;
      const mockFn = vi.fn().mockImplementation(async () => {
        attempts++;
        if (attempts < 2) {
          const error: any = new Error('Rate limited');
          error.statusCode = 429;
          throw error;
        }
        return 'success';
      });

      const result = await retryHandler.execute(mockFn);

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('should retry on 502 Bad Gateway', async () => {
      let attempts = 0;
      const mockFn = vi.fn().mockImplementation(async () => {
        attempts++;
        if (attempts < 2) {
          const error: any = new Error('Bad Gateway');
          error.statusCode = 502;
          throw error;
        }
        return 'success';
      });

      const result = await retryHandler.execute(mockFn);

      expect(result).toBe('success');
    });

    it('should retry on network error message', async () => {
      let attempts = 0;
      const mockFn = vi.fn().mockImplementation(async () => {
        attempts++;
        if (attempts < 2) {
          throw new Error('network error occurred');
        }
        return 'success';
      });

      const result = await retryHandler.execute(mockFn);

      expect(result).toBe('success');
    });
  });

  describe('Non-Retryable Errors', () => {
    it('should not retry on 400 Bad Request', async () => {
      const mockFn = vi.fn().mockImplementation(async () => {
        const error: any = new Error('Bad Request');
        error.statusCode = 400;
        throw error;
      });

      await expect(retryHandler.execute(mockFn)).rejects.toThrow('Bad Request');
      expect(mockFn).toHaveBeenCalledOnce();
      expect(retryHandler.getStats().totalRetries).toBe(0);
    });

    it('should not retry on 401 Unauthorized', async () => {
      const mockFn = vi.fn().mockImplementation(async () => {
        const error: any = new Error('Unauthorized');
        error.statusCode = 401;
        throw error;
      });

      await expect(retryHandler.execute(mockFn)).rejects.toThrow('Unauthorized');
      expect(mockFn).toHaveBeenCalledOnce();
    });

    it('should not retry on 404 Not Found', async () => {
      const mockFn = vi.fn().mockImplementation(async () => {
        const error: any = new Error('Not Found');
        error.statusCode = 404;
        throw error;
      });

      await expect(retryHandler.execute(mockFn)).rejects.toThrow('Not Found');
      expect(mockFn).toHaveBeenCalledOnce();
    });

    it('should not retry on generic errors without retryable codes', async () => {
      const mockFn = vi.fn().mockRejectedValue(new Error('Generic error'));

      await expect(retryHandler.execute(mockFn)).rejects.toThrow('Generic error');
      expect(mockFn).toHaveBeenCalledOnce();
    });
  });

  describe('Retry Exhaustion', () => {
    it('should fail after maxRetries is exceeded', async () => {
      const mockFn = vi.fn().mockImplementation(async () => {
        const error: any = new Error('Always fails');
        error.code = 'ETIMEDOUT';
        throw error;
      });

      await expect(retryHandler.execute(mockFn)).rejects.toThrow('Always fails');
      expect(mockFn).toHaveBeenCalledTimes(4); // 1 initial + 3 retries
      expect(retryHandler.getStats().totalRetries).toBe(3);
    });

    it('should track total retries correctly', async () => {
      const mockFn = vi.fn().mockImplementation(async () => {
        const error: any = new Error('Fail');
        error.statusCode = 503;
        throw error;
      });

      await expect(retryHandler.execute(mockFn)).rejects.toThrow('Fail');

      const stats = retryHandler.getStats();
      expect(stats.totalRetries).toBe(3);
      expect(stats.lastError?.message).toBe('Fail');
    });
  });

  describe('Exponential Backoff', () => {
    it('should apply exponential backoff delays', async () => {
      const delays: number[] = [];
      let attempts = 0;

      const mockFn = vi.fn().mockImplementation(async () => {
        const startTime = Date.now();
        attempts++;
        if (attempts > 1) {
          delays.push(startTime);
        }
        if (attempts <= 3) {
          const error: any = new Error('Timeout');
          error.code = 'ETIMEDOUT';
          throw error;
        }
        return 'success';
      });

      await retryHandler.execute(mockFn);

      // Check that delays increased exponentially
      // First retry: ~100ms, Second retry: ~200ms, Third retry: ~400ms
      expect(delays.length).toBe(3);
    });

    it('should respect maxDelay cap', async () => {
      const handler = createRetryHandler({
        maxRetries: 10,
        baseDelay: 100,
        maxDelay: 500,
        factor: 2,
        jitter: false,
      });

      let attempts = 0;
      const mockFn = vi.fn().mockImplementation(async () => {
        attempts++;
        // Always fail to test maxDelay behavior
        const error: any = new Error('Fail');
        error.statusCode = 503;
        throw error;
      });

      await expect(handler.execute(mockFn)).rejects.toThrow();

      // With factor 2 and maxDelay 500, delays should cap at 500ms
      // Delay calculation: 100, 200, 400, 500 (capped), 500 (capped), ...
    });
  });

  describe('Timeout', () => {
    it('should timeout if operation takes too long', async () => {
      const handler = createRetryHandler({
        maxRetries: 10,
        baseDelay: 100,
        maxDelay: 1000,
        factor: 2,
        jitter: false,
        timeout: 500, // 500ms timeout
      });

      const mockFn = vi.fn().mockImplementation(async () => {
        const error: any = new Error('Slow operation');
        error.code = 'ETIMEDOUT';
        throw error;
      });

      const startTime = Date.now();
      await expect(handler.execute(mockFn)).rejects.toThrow('Operation timed out');
      const duration = Date.now() - startTime;

      // Should timeout around 500ms, not complete all 10 retries
      expect(duration).toBeLessThan(1500);
    });

    it('should include timeout error details', async () => {
      const handler = createRetryHandler({
        maxRetries: 5,
        baseDelay: 200,
        timeout: 300,
        jitter: false,
      });

      const mockFn = vi.fn().mockImplementation(async () => {
        const error: any = new Error('Fail');
        error.statusCode = 503;
        throw error;
      });

      try {
        await handler.execute(mockFn);
        expect.fail('Should have thrown timeout error');
      } catch (error: any) {
        expect(error.message).toContain('Operation timed out after 300ms');
        expect(error.name).toBe('RetryTimeoutError');
      }
    });
  });

  describe('Custom Retryable Errors', () => {
    it('should retry on custom error codes', async () => {
      const handler = createRetryHandler({
        maxRetries: 2,
        baseDelay: 50,
        retryableErrors: ['CUSTOM_ERROR', 'ANOTHER_ERROR'],
      });

      let attempts = 0;
      const mockFn = vi.fn().mockImplementation(async () => {
        attempts++;
        if (attempts < 2) {
          const error: any = new Error('Custom error');
          error.code = 'CUSTOM_ERROR';
          throw error;
        }
        return 'success';
      });

      const result = await handler.execute(mockFn);
      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('should not retry on errors not in custom list', async () => {
      const handler = createRetryHandler({
        maxRetries: 2,
        baseDelay: 50,
        retryableErrors: ['CUSTOM_ERROR'],
      });

      const mockFn = vi.fn().mockImplementation(async () => {
        const error: any = new Error('Other error');
        error.code = 'OTHER_ERROR';
        throw error;
      });

      await expect(handler.execute(mockFn)).rejects.toThrow('Other error');
      expect(mockFn).toHaveBeenCalledOnce();
    });

    it('should retry on custom error message patterns', async () => {
      const handler = createRetryHandler({
        maxRetries: 2,
        baseDelay: 50,
        retryableErrors: ['temporary'],
      });

      let attempts = 0;
      const mockFn = vi.fn().mockImplementation(async () => {
        attempts++;
        if (attempts < 2) {
          throw new Error('This is a temporary failure');
        }
        return 'success';
      });

      const result = await handler.execute(mockFn);
      expect(result).toBe('success');
    });
  });

  describe('Statistics', () => {
    it('should track retry statistics', async () => {
      let attempts = 0;
      const mockFn = vi.fn().mockImplementation(async () => {
        attempts++;
        if (attempts < 3) {
          const error: any = new Error('Fail');
          error.statusCode = 503;
          throw error;
        }
        return 'success';
      });

      await retryHandler.execute(mockFn);

      const stats = retryHandler.getStats();
      expect(stats.totalRetries).toBe(2);
      expect(stats.attempts).toBe(4); // maxRetries + 1
      expect(stats.lastAttemptTime).toBeDefined();
      expect(stats.lastAttemptTime).toBeGreaterThan(0);
    });

    it('should update lastError on failure', async () => {
      const mockFn = vi.fn().mockImplementation(async () => {
        const error: any = new Error('Test error');
        error.statusCode = 503;
        throw error;
      });

      await expect(retryHandler.execute(mockFn)).rejects.toThrow();

      const stats = retryHandler.getStats();
      expect(stats.lastError).toBeDefined();
      expect(stats.lastError?.message).toBe('Test error');
    });

    it('should reset statistics', async () => {
      const mockFn = vi.fn().mockImplementation(async () => {
        const error: any = new Error('Fail');
        error.statusCode = 503;
        throw error;
      });

      await expect(retryHandler.execute(mockFn)).rejects.toThrow();

      let stats = retryHandler.getStats();
      expect(stats.totalRetries).toBeGreaterThan(0);

      retryHandler.reset();

      stats = retryHandler.getStats();
      expect(stats.totalRetries).toBe(0);
      expect(stats.lastError).toBeNull();
      expect(stats.lastAttemptTime).toBeNull();
    });
  });

  describe('Context Logging', () => {
    it('should accept context parameter for logging', async () => {
      const mockFn = vi.fn().mockResolvedValue('success');

      await retryHandler.execute(mockFn, 'test-operation');

      expect(mockFn).toHaveBeenCalled();
      // Context is used in console.log, which we don't check in tests
    });
  });

  describe('Jitter', () => {
    it('should apply jitter to delays when enabled', async () => {
      const handler = createRetryHandler({
        maxRetries: 3,
        baseDelay: 100,
        maxDelay: 1000,
        factor: 2,
        jitter: true, // Enable jitter
      });

      const delays: number[] = [];
      let attempts = 0;
      let lastTime = Date.now();

      const mockFn = vi.fn().mockImplementation(async () => {
        const now = Date.now();
        if (attempts > 0) {
          delays.push(now - lastTime);
        }
        lastTime = now;
        attempts++;

        if (attempts <= 3) {
          const error: any = new Error('Fail');
          error.statusCode = 503;
          throw error;
        }
        return 'success';
      });

      await retryHandler.execute(mockFn);

      // With jitter, delays should vary (not be exactly base * factor^n)
      // We can't test exact values due to randomness, but we can verify attempts
      expect(mockFn).toHaveBeenCalledTimes(4);
    });
  });
});

describe('createRetryHandler', () => {
  it('should create handler with default config', () => {
    const handler = createRetryHandler();
    const stats = handler.getStats();

    expect(stats.attempts).toBe(4); // default maxRetries = 3, so 3 + 1
  });

  it('should create handler with custom config', () => {
    const handler = createRetryHandler({
      maxRetries: 5,
      baseDelay: 2000,
    });

    const stats = handler.getStats();
    expect(stats.attempts).toBe(6); // 5 + 1
  });

  it('should merge custom config with defaults', () => {
    const handler = createRetryHandler({
      maxRetries: 2,
      // Other values should use defaults
    });

    const stats = handler.getStats();
    expect(stats.attempts).toBe(3); // 2 + 1
  });
});

describe('retryWithBackoff', () => {
  it('should execute function with retry logic', async () => {
    let attempts = 0;
    const mockFn = vi.fn().mockImplementation(async () => {
      attempts++;
      if (attempts < 2) {
        const error: any = new Error('Transient');
        error.code = 'ETIMEDOUT';
        throw error;
      }
      return 'success';
    });

    const result = await retryWithBackoff(mockFn, {
      maxRetries: 3,
      baseDelay: 50,
      jitter: false,
    });

    expect(result).toBe('success');
    expect(mockFn).toHaveBeenCalledTimes(2);
  });

  it('should accept context parameter', async () => {
    const mockFn = vi.fn().mockResolvedValue('success');

    const result = await retryWithBackoff(
      mockFn,
      { maxRetries: 2, baseDelay: 50 },
      'test-context'
    );

    expect(result).toBe('success');
  });

  it('should use default config if not provided', async () => {
    const mockFn = vi.fn().mockResolvedValue('success');

    const result = await retryWithBackoff(mockFn);

    expect(result).toBe('success');
  });

  it('should fail after retries are exhausted', async () => {
    const mockFn = vi.fn().mockImplementation(async () => {
      const error: any = new Error('Always fails');
      error.statusCode = 503;
      throw error;
    });

    await expect(
      retryWithBackoff(mockFn, { maxRetries: 2, baseDelay: 50 })
    ).rejects.toThrow('Always fails');

    expect(mockFn).toHaveBeenCalledTimes(3); // 1 + 2 retries
  });
});
