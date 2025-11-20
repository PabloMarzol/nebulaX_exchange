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
    name;
    config;
    tokens;
    lastRefillTime;
    queue = [];
    refillInterval = null;
    // Statistics
    totalRequests = 0;
    totalThrottled = 0;
    totalRejected = 0;
    constructor(name, config) {
        this.name = name;
        this.config = config;
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
    async acquire(tokensNeeded = 1) {
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
    tryConsume(tokensNeeded) {
        if (this.tokens >= tokensNeeded) {
            this.tokens -= tokensNeeded;
            return true;
        }
        return false;
    }
    /**
     * Enqueue a request to wait for tokens
     */
    enqueue(tokensNeeded) {
        const maxQueueSize = this.config.maxQueueSize || 100;
        if (this.queue.length >= maxQueueSize) {
            this.totalRejected++;
            return Promise.reject(new Error(`[RateLimiter:${this.name}] Queue full (${this.queue.length}/${maxQueueSize}). Request rejected.`));
        }
        this.totalThrottled++;
        return new Promise((resolve, reject) => {
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
    startRefill() {
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
    processQueue() {
        while (this.queue.length > 0) {
            const request = this.queue[0];
            if (this.tryConsume(request.tokensNeeded)) {
                this.queue.shift();
                request.resolve();
            }
            else {
                // Not enough tokens, wait for next refill
                break;
            }
        }
    }
    /**
     * Execute a function with rate limiting
     */
    async execute(fn, tokensNeeded = 1) {
        await this.acquire(tokensNeeded);
        return fn();
    }
    /**
     * Get rate limiter statistics
     */
    getStats() {
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
    resetStats() {
        this.totalRequests = 0;
        this.totalThrottled = 0;
        this.totalRejected = 0;
    }
    /**
     * Clear all queued requests
     */
    clearQueue() {
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
    shutdown() {
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
export function createRateLimiter(name, config) {
    const defaultConfig = {
        requestsPerSecond: 10,
        burstCapacity: 20,
        maxQueueSize: 100,
    };
    return new RateLimiter(name, { ...defaultConfig, ...config });
}
