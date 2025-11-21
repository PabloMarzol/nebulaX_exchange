/**
 * ReconnectionHandler
 *
 * Manages automatic reconnection for WebSocket subscriptions with exponential backoff.
 * Ensures reliable real-time data flow even when Hyperliquid's WebSocket server restarts.
 */
export class ReconnectionHandler {
    config;
    callbacks;
    attemptCount = 0;
    reconnectTimer = null;
    state = 'disconnected';
    isShuttingDown = false;
    constructor(config, callbacks) {
        this.config = {
            maxAttempts: config.maxAttempts || 10,
            baseDelay: config.baseDelay || 1000,
            maxDelay: config.maxDelay || 60000,
            factor: config.factor || 2,
        };
        this.callbacks = callbacks;
    }
    /**
     * Mark connection as established
     */
    connected() {
        this.attemptCount = 0;
        this.setState('connected');
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        console.log('[ReconnectionHandler] Connection established');
    }
    /**
     * Mark connection as lost and start reconnection attempts
     */
    disconnected(error) {
        if (this.isShuttingDown) {
            return;
        }
        this.setState('disconnected');
        console.warn('[ReconnectionHandler] Connection lost', error?.message || '');
        // Start reconnection process
        this.scheduleReconnect();
    }
    /**
     * Schedule next reconnection attempt with exponential backoff
     */
    scheduleReconnect() {
        if (this.isShuttingDown) {
            return;
        }
        if (this.attemptCount >= this.config.maxAttempts) {
            const error = new Error(`Max reconnection attempts (${this.config.maxAttempts}) reached`);
            console.error('[ReconnectionHandler]', error.message);
            this.callbacks.onFailed(error);
            return;
        }
        // Calculate delay with exponential backoff
        const delay = Math.min(this.config.baseDelay * Math.pow(this.config.factor, this.attemptCount), this.config.maxDelay);
        this.attemptCount++;
        this.setState('reconnecting');
        console.log(`[ReconnectionHandler] Reconnection attempt ${this.attemptCount}/${this.config.maxAttempts} in ${delay}ms`);
        this.reconnectTimer = setTimeout(async () => {
            try {
                await this.callbacks.onReconnect();
                this.connected();
            }
            catch (error) {
                console.error(`[ReconnectionHandler] Reconnection attempt ${this.attemptCount} failed:`, error.message);
                this.scheduleReconnect();
            }
        }, delay);
    }
    /**
     * Force an immediate reconnection attempt
     */
    async reconnectNow() {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        this.setState('reconnecting');
        try {
            await this.callbacks.onReconnect();
            this.connected();
        }
        catch (error) {
            console.error('[ReconnectionHandler] Immediate reconnection failed:', error.message);
            this.scheduleReconnect();
        }
    }
    /**
     * Reset reconnection state
     */
    reset() {
        this.attemptCount = 0;
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        this.setState('disconnected');
    }
    /**
     * Stop reconnection attempts
     */
    shutdown() {
        this.isShuttingDown = true;
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        this.setState('disconnected');
        console.log('[ReconnectionHandler] Shutdown complete');
    }
    /**
     * Get current connection state
     */
    getState() {
        return this.state;
    }
    /**
     * Get current attempt count
     */
    getAttemptCount() {
        return this.attemptCount;
    }
    /**
     * Check if currently reconnecting
     */
    isReconnecting() {
        return this.state === 'reconnecting';
    }
    /**
     * Set connection state and notify callback
     */
    setState(state) {
        const previousState = this.state;
        this.state = state;
        if (previousState !== state && this.callbacks.onStateChange) {
            this.callbacks.onStateChange(state);
        }
    }
}
/**
 * Create a reconnection handler for a specific subscription
 */
export function createReconnectionHandler(name, reconnectFn, config) {
    return new ReconnectionHandler(config || {}, {
        onReconnect: async () => {
            console.log(`[ReconnectionHandler:${name}] Attempting to reconnect...`);
            await reconnectFn();
            console.log(`[ReconnectionHandler:${name}] Reconnected successfully`);
        },
        onFailed: (error) => {
            console.error(`[ReconnectionHandler:${name}] Reconnection failed:`, error.message);
        },
        onStateChange: (state) => {
            console.log(`[ReconnectionHandler:${name}] State changed to: ${state}`);
        },
    });
}
/**
 * Utility function to wrap a WebSocket subscription with automatic reconnection
 */
export async function withReconnection(name, subscribeFn, config) {
    let subscription;
    const handler = createReconnectionHandler(name, async () => {
        subscription = await subscribeFn();
    }, config);
    // Initial subscription
    subscription = await subscribeFn();
    handler.connected();
    return { subscription, handler };
}
