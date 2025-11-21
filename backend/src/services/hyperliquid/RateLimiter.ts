/**
 * RateLimiter
 *
 * Implements rate limiting using the token bucket algorithm.
 *
 * Features:
 * - Token bucket algorithm for smooth rate limiting
 * - Configurable requests per time window
 * - Burst capacity support
 * - Queue management for waiting requests
 * - Statistics tracking
 */

export interface RateLimiterConfig {
  requestsPerSecond: number; // Maximum requests per second
  burstCapacity?: number; // Maximum burst size (defaults to requestsPerSecond)
  maxQueueSize?: number; // Maximum number of queued requests (default: 100)
}

export interface RateLimiterStats {
  availableTokens: number;
  queuedRequests: number;
  totalRequests: number;
  totalThrottled: number;
  totalRejected: number;
}

interface QueuedRequest {
  tokensNeeded: number;
  resolve: () => void;
  reject: (error: Error) => void;
  timestamp: number;
}

/**
 * RateLimiter class
 *
 * Implements token bucket algorithm:
 * - Tokens are added at a constant rate (refill rate)
 * - Each request consumes one token
 * - If tokens available, request proceeds immediately
 * - If no tokens, request is queued or rejected
 */
export class RateLimiter {
  private tokens: number;
  private lastRefillTime: number;
  private queue: QueuedRequest[] = [];
  private refillInterval: NodeJS.Timeout | null = null;

  // Statistics
  private totalRequests: number = 0;
  private totalThrottled: number = 0;
  private totalRejected: number = 0;

  constructor(
    private name: string,
    private config: RateLimiterConfig
  ) {
    this.tokens = config.burstCapacity || config.requestsPerSecond;
    this.lastRefillTime = Date.now();

    // Start token refill timer
    this.startRefill();

    console.log(`[RateLimiter:${name}] Initialized:`, {
      requestsPerSecond: config.requestsPerSecond,
      burstCapacity: config.burstCapacity || config.requestsPerSecond,
      maxQueueSize: config.maxQueueSize || 100,
    });
  }

  /**
   * Acquire a token to proceed with request
   *
   * Returns immediately if token available,
   * otherwise waits in queue
   */
  async acquire(tokensNeeded: number = 1): Promise<void> {
    this.totalRequests++;

    // Try to consume tokens immediately
    if (this.tryConsume(tokensNeeded)) {
      return;
    }

    // No tokens available, queue the request
    return this.enqueue(tokensNeeded);
  }

  /**
   * Try to consume tokens immediately
   */
  private tryConsume(tokensNeeded: number): boolean {
    if (this.tokens >= tokensNeeded) {
      this.tokens -= tokensNeeded;
      return true;
    }
    return false;
  }

  /**
   * Enqueue a request to wait for tokens
   */
  private enqueue(tokensNeeded: number): Promise<void> {
    const maxQueueSize = this.config.maxQueueSize || 100;

    if (this.queue.length >= maxQueueSize) {
      this.totalRejected++;
      return Promise.reject(
        new Error(
          `[RateLimiter:${this.name}] Queue full (${this.queue.length}/${maxQueueSize}). Request rejected.`
        )
      );
    }

    this.totalThrottled++;

    return new Promise<void>((resolve, reject) => {
      this.queue.push({
        tokensNeeded,
        resolve,
        reject,
        timestamp: Date.now(),
      });
    });
  }

  /**
   * Refill tokens periodically
   */
  private startRefill(): void {
    // Refill tokens every 100ms for smooth rate limiting
    const refillIntervalMs = 100;
    const tokensPerRefill = (this.config.requestsPerSecond * refillIntervalMs) / 1000;

    this.refillInterval = setInterval(() => {
      const maxTokens = this.config.burstCapacity || this.config.requestsPerSecond;

      // Add tokens up to burst capacity
      this.tokens = Math.min(this.tokens + tokensPerRefill, maxTokens);

      // Process queued requests
      this.processQueue();
    }, refillIntervalMs);
  }

  /**
   * Process queued requests
   */
  private processQueue(): void {
    while (this.queue.length > 0) {
      const request = this.queue[0];

      if (this.tryConsume(request.tokensNeeded)) {
        this.queue.shift();
        request.resolve();
      } else {
        // Not enough tokens, wait for next refill
        break;
      }
    }
  }

  /**
   * Execute a function with rate limiting
   */
  async execute<T>(fn: () => Promise<T>, tokensNeeded: number = 1): Promise<T> {
    await this.acquire(tokensNeeded);
    return fn();
  }

  /**
   * Get rate limiter statistics
   */
  getStats(): RateLimiterStats {
    return {
      availableTokens: Math.floor(this.tokens),
      queuedRequests: this.queue.length,
      totalRequests: this.totalRequests,
      totalThrottled: this.totalThrottled,
      totalRejected: this.totalRejected,
    };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.totalRequests = 0;
    this.totalThrottled = 0;
    this.totalRejected = 0;
  }

  /**
   * Clear all queued requests
   */
  clearQueue(): void {
    const clearedCount = this.queue.length;
    this.queue.forEach((request) => {
      request.reject(new Error(`[RateLimiter:${this.name}] Queue cleared`));
    });
    this.queue = [];
    console.log(`[RateLimiter:${this.name}] Cleared ${clearedCount} queued requests`);
  }

  /**
   * Shutdown the rate limiter
   */
  shutdown(): void {
    if (this.refillInterval) {
      clearInterval(this.refillInterval);
      this.refillInterval = null;
    }
    this.clearQueue();
    console.log(`[RateLimiter:${this.name}] Shutdown complete`);
  }
}

/**
 * Create a rate limiter with default config
 */
export function createRateLimiter(
  name: string,
  config?: Partial<RateLimiterConfig>
): RateLimiter {
  const defaultConfig: RateLimiterConfig = {
    requestsPerSecond: 10,
    burstCapacity: 20,
    maxQueueSize: 100,
  };

  return new RateLimiter(name, { ...defaultConfig, ...config });
}
