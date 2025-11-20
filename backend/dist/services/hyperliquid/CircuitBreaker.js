/**
 * CircuitBreaker
 *
 * Implements the circuit breaker pattern to prevent cascading failures
 * when external services (like Hyperliquid API) are experiencing issues.
 *
 * States:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Too many failures, requests are blocked
 * - HALF_OPEN: Testing if service has recovered
 *
 * Behavior:
 * - In CLOSED state, requests execute normally
 * - After failureThreshold failures, circuit opens
 * - In OPEN state, requests fail fast without calling service
 * - After resetTimeout, circuit moves to HALF_OPEN
 * - In HALF_OPEN, first successThreshold requests are tested
 * - If they succeed, circuit closes; if they fail, circuit reopens
 */
export var CircuitState;
(function (CircuitState) {
    CircuitState["CLOSED"] = "CLOSED";
    CircuitState["OPEN"] = "OPEN";
    CircuitState["HALF_OPEN"] = "HALF_OPEN";
})(CircuitState || (CircuitState = {}));
/**
 * CircuitBreaker class
 *
 * Protects against cascading failures by:
 * 1. Monitoring failure rate of operations
 * 2. Opening circuit after threshold failures
 * 3. Failing fast when circuit is open
 * 4. Periodically testing if service recovered
 */
export class CircuitBreaker {
    name;
    config;
    state = CircuitState.CLOSED;
    failureCount = 0;
    successCount = 0;
    nextAttemptTime = 0;
    lastFailureTime = null;
    lastSuccessTime = null;
    // Statistics
    totalCalls = 0;
    totalFailures = 0;
    totalSuccesses = 0;
    // Failure tracking for monitoring period
    failureTimestamps = [];
    constructor(name, config) {
        this.name = name;
        this.config = config;
        console.log(`[CircuitBreaker:${name}] Initialized with config:`, config);
    }
    /**
     * Execute a function with circuit breaker protection
     */
    async execute(fn) {
        this.totalCalls++;
        // Clean up old failure timestamps outside monitoring period
        this.cleanupFailureTimestamps();
        // Check circuit state before executing
        if (this.state === CircuitState.OPEN) {
            if (Date.now() < this.nextAttemptTime) {
                // Circuit is open and timeout hasn't elapsed
                const error = new Error(`[CircuitBreaker:${this.name}] Circuit is OPEN. Service unavailable. ` +
                    `Next attempt in ${Math.ceil((this.nextAttemptTime - Date.now()) / 1000)}s`);
                error.name = 'CircuitBreakerOpenError';
                throw error;
            }
            else {
                // Timeout elapsed, try half-open
                this.toHalfOpen();
            }
        }
        try {
            const result = await fn();
            this.onSuccess();
            return result;
        }
        catch (error) {
            this.onFailure();
            throw error;
        }
    }
    /**
     * Record a successful execution
     */
    onSuccess() {
        this.totalSuccesses++;
        this.lastSuccessTime = Date.now();
        if (this.state === CircuitState.HALF_OPEN) {
            this.successCount++;
            console.log(`[CircuitBreaker:${this.name}] Success in HALF_OPEN state (${this.successCount}/${this.config.successThreshold})`);
            if (this.successCount >= this.config.successThreshold) {
                this.toClosed();
            }
        }
        else if (this.state === CircuitState.CLOSED) {
            // Reset failure count on success in closed state
            this.failureCount = 0;
            this.failureTimestamps = [];
        }
    }
    /**
     * Record a failed execution
     */
    onFailure() {
        this.totalFailures++;
        this.lastFailureTime = Date.now();
        this.failureCount++;
        this.failureTimestamps.push(Date.now());
        console.log(`[CircuitBreaker:${this.name}] Failure recorded (${this.failureCount}/${this.config.failureThreshold})`);
        if (this.state === CircuitState.HALF_OPEN) {
            // Any failure in half-open immediately opens circuit
            this.toOpen();
        }
        else if (this.state === CircuitState.CLOSED) {
            // Check if we've exceeded failure threshold within monitoring period
            const recentFailures = this.failureTimestamps.filter((timestamp) => Date.now() - timestamp <= this.config.monitoringPeriod);
            if (recentFailures.length >= this.config.failureThreshold) {
                this.toOpen();
            }
        }
    }
    /**
     * Transition to CLOSED state
     */
    toClosed() {
        console.log(`[CircuitBreaker:${this.name}] State: HALF_OPEN -> CLOSED`);
        this.state = CircuitState.CLOSED;
        this.failureCount = 0;
        this.successCount = 0;
        this.failureTimestamps = [];
    }
    /**
     * Transition to OPEN state
     */
    toOpen() {
        console.log(`[CircuitBreaker:${this.name}] State: ${this.state} -> OPEN`);
        this.state = CircuitState.OPEN;
        this.nextAttemptTime = Date.now() + this.config.resetTimeout;
        console.log(`[CircuitBreaker:${this.name}] Circuit opened. Will attempt recovery at ${new Date(this.nextAttemptTime).toISOString()}`);
    }
    /**
     * Transition to HALF_OPEN state
     */
    toHalfOpen() {
        console.log(`[CircuitBreaker:${this.name}] State: OPEN -> HALF_OPEN`);
        this.state = CircuitState.HALF_OPEN;
        this.successCount = 0;
    }
    /**
     * Clean up old failure timestamps outside monitoring period
     */
    cleanupFailureTimestamps() {
        const cutoffTime = Date.now() - this.config.monitoringPeriod;
        this.failureTimestamps = this.failureTimestamps.filter((timestamp) => timestamp > cutoffTime);
    }
    /**
     * Get current circuit state
     */
    getState() {
        return this.state;
    }
    /**
     * Get circuit breaker statistics
     */
    getStats() {
        return {
            state: this.state,
            failures: this.failureCount,
            successes: this.successCount,
            totalCalls: this.totalCalls,
            totalFailures: this.totalFailures,
            totalSuccesses: this.totalSuccesses,
            lastFailureTime: this.lastFailureTime,
            lastSuccessTime: this.lastSuccessTime,
        };
    }
    /**
     * Manually reset the circuit breaker
     */
    reset() {
        console.log(`[CircuitBreaker:${this.name}] Manual reset`);
        this.state = CircuitState.CLOSED;
        this.failureCount = 0;
        this.successCount = 0;
        this.failureTimestamps = [];
        this.nextAttemptTime = 0;
    }
    /**
     * Check if circuit is available (closed or half-open)
     */
    isAvailable() {
        if (this.state === CircuitState.CLOSED || this.state === CircuitState.HALF_OPEN) {
            return true;
        }
        if (this.state === CircuitState.OPEN && Date.now() >= this.nextAttemptTime) {
            return true;
        }
        return false;
    }
}
/**
 * Create a circuit breaker with default config
 */
export function createCircuitBreaker(name, config) {
    const defaultConfig = {
        failureThreshold: 5, // Open after 5 failures
        successThreshold: 2, // Close after 2 successes in half-open
        resetTimeout: 30000, // Try again after 30 seconds
        monitoringPeriod: 60000, // Count failures within 60 seconds
    };
    return new CircuitBreaker(name, { ...defaultConfig, ...config });
}
