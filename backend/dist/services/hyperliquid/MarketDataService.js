import { EventEmitter } from 'events';
import { getHyperliquidClient } from './HyperliquidClient';
/**
 * MarketDataService
 *
 * Manages WebSocket subscriptions to Hyperliquid and provides
 * a unified interface for real-time market data.
 *
 * Features:
 * - Automatic subscription deduplication
 * - Reference counting (multiple subscribers to same data)
 * - Event-based architecture for easy integration
 * - Automatic cleanup of unused subscriptions
 * - Error handling and reconnection
 */
export class MarketDataService extends EventEmitter {
    client = getHyperliquidClient();
    subscriptions = new Map();
    reconnectAttempts = 0;
    maxReconnectAttempts = 10;
    reconnectDelay = 1000; // Base delay in ms
    isShuttingDown = false;
    constructor() {
        super();
        this.setMaxListeners(100); // Support many subscribers
    }
    /**
     * Subscribe to orderbook updates for a symbol
     * Multiple calls with the same symbol will reuse the same subscription
     */
    async subscribeToOrderbook(symbol) {
        const key = `orderbook:${symbol}`;
        // Check if already subscribed
        const existing = this.subscriptions.get(key);
        if (existing) {
            existing.subscriberCount++;
            console.log(`[MarketDataService] Reusing orderbook subscription for ${symbol} (subscribers: ${existing.subscriberCount})`);
            return;
        }
        try {
            // Create new subscription
            const unsubscribe = await this.client.subscribeToOrderbook(symbol, (data) => {
                this.emit('orderbook', { symbol, data });
                this.updateSubscriptionTimestamp(key);
            });
            // Store subscription
            this.subscriptions.set(key, {
                type: 'orderbook',
                symbol,
                unsubscribe,
                subscriberCount: 1,
                lastUpdate: new Date(),
            });
            console.log(`[MarketDataService] Subscribed to orderbook: ${symbol}`);
        }
        catch (error) {
            console.error(`[MarketDataService] Failed to subscribe to orderbook ${symbol}:`, error);
            throw error;
        }
    }
    /**
     * Subscribe to trades stream for a symbol
     */
    async subscribeToTrades(symbol) {
        const key = `trades:${symbol}`;
        const existing = this.subscriptions.get(key);
        if (existing) {
            existing.subscriberCount++;
            console.log(`[MarketDataService] Reusing trades subscription for ${symbol} (subscribers: ${existing.subscriberCount})`);
            return;
        }
        try {
            const unsubscribe = await this.client.subscribeToTrades(symbol, (data) => {
                this.emit('trades', { symbol, data });
                this.updateSubscriptionTimestamp(key);
            });
            this.subscriptions.set(key, {
                type: 'trades',
                symbol,
                unsubscribe,
                subscriberCount: 1,
                lastUpdate: new Date(),
            });
            console.log(`[MarketDataService] Subscribed to trades: ${symbol}`);
        }
        catch (error) {
            console.error(`[MarketDataService] Failed to subscribe to trades ${symbol}:`, error);
            throw error;
        }
    }
    /**
     * Subscribe to candle updates for a symbol and interval
     */
    async subscribeToCandles(symbol, interval) {
        const key = `candles:${symbol}:${interval}`;
        const existing = this.subscriptions.get(key);
        if (existing) {
            existing.subscriberCount++;
            console.log(`[MarketDataService] Reusing candles subscription for ${symbol} ${interval} (subscribers: ${existing.subscriberCount})`);
            return;
        }
        try {
            const unsubscribe = await this.client.subscribeToCandles(symbol, interval, (data) => {
                this.emit('candles', { symbol, interval, data });
                this.updateSubscriptionTimestamp(key);
            });
            this.subscriptions.set(key, {
                type: 'candles',
                symbol,
                interval,
                unsubscribe,
                subscriberCount: 1,
                lastUpdate: new Date(),
            });
            console.log(`[MarketDataService] Subscribed to candles: ${symbol} ${interval}`);
        }
        catch (error) {
            console.error(`[MarketDataService] Failed to subscribe to candles ${symbol} ${interval}:`, error);
            throw error;
        }
    }
    /**
     * Subscribe to all mid prices
     */
    async subscribeToAllMids() {
        const key = 'allMids';
        const existing = this.subscriptions.get(key);
        if (existing) {
            existing.subscriberCount++;
            console.log(`[MarketDataService] Reusing allMids subscription (subscribers: ${existing.subscriberCount})`);
            return;
        }
        try {
            const unsubscribe = await this.client.subscribeToAllMids((data) => {
                this.emit('allMids', { data });
                this.updateSubscriptionTimestamp(key);
            });
            this.subscriptions.set(key, {
                type: 'allMids',
                unsubscribe,
                subscriberCount: 1,
                lastUpdate: new Date(),
            });
            console.log('[MarketDataService] Subscribed to allMids');
        }
        catch (error) {
            console.error('[MarketDataService] Failed to subscribe to allMids:', error);
            throw error;
        }
    }
    /**
     * Subscribe to user events (order fills, cancellations, etc.)
     */
    async subscribeToUserEvents(userAddress) {
        const key = `userEvents:${userAddress}`;
        const existing = this.subscriptions.get(key);
        if (existing) {
            existing.subscriberCount++;
            console.log(`[MarketDataService] Reusing userEvents subscription for ${userAddress} (subscribers: ${existing.subscriberCount})`);
            return;
        }
        try {
            const unsubscribe = await this.client.subscribeToUserEvents(userAddress, (data) => {
                this.emit('userEvents', { userAddress, data });
                this.updateSubscriptionTimestamp(key);
            });
            this.subscriptions.set(key, {
                type: 'userEvents',
                userAddress,
                unsubscribe,
                subscriberCount: 1,
                lastUpdate: new Date(),
            });
            console.log(`[MarketDataService] Subscribed to userEvents: ${userAddress}`);
        }
        catch (error) {
            console.error(`[MarketDataService] Failed to subscribe to userEvents ${userAddress}:`, error);
            throw error;
        }
    }
    /**
     * Unsubscribe from orderbook updates
     * Decrements reference count and only unsubscribes when count reaches 0
     */
    async unsubscribeFromOrderbook(symbol) {
        await this.decrementSubscription(`orderbook:${symbol}`);
    }
    /**
     * Unsubscribe from trades
     */
    async unsubscribeFromTrades(symbol) {
        await this.decrementSubscription(`trades:${symbol}`);
    }
    /**
     * Unsubscribe from candles
     */
    async unsubscribeFromCandles(symbol, interval) {
        await this.decrementSubscription(`candles:${symbol}:${interval}`);
    }
    /**
     * Unsubscribe from all mids
     */
    async unsubscribeFromAllMids() {
        await this.decrementSubscription('allMids');
    }
    /**
     * Unsubscribe from user events
     */
    async unsubscribeFromUserEvents(userAddress) {
        await this.decrementSubscription(`userEvents:${userAddress}`);
    }
    /**
     * Decrement subscription reference count and unsubscribe if zero
     */
    async decrementSubscription(key) {
        const subscription = this.subscriptions.get(key);
        if (!subscription) {
            console.warn(`[MarketDataService] Attempted to unsubscribe from non-existent subscription: ${key}`);
            return;
        }
        subscription.subscriberCount--;
        if (subscription.subscriberCount <= 0) {
            try {
                await subscription.unsubscribe();
                this.subscriptions.delete(key);
                console.log(`[MarketDataService] Unsubscribed from ${key}`);
            }
            catch (error) {
                console.error(`[MarketDataService] Error unsubscribing from ${key}:`, error);
            }
        }
        else {
            console.log(`[MarketDataService] Decreased subscriber count for ${key} (remaining: ${subscription.subscriberCount})`);
        }
    }
    /**
     * Update last update timestamp for a subscription
     */
    updateSubscriptionTimestamp(key) {
        const subscription = this.subscriptions.get(key);
        if (subscription) {
            subscription.lastUpdate = new Date();
        }
    }
    /**
     * Get all active subscriptions
     */
    getActiveSubscriptions() {
        return Array.from(this.subscriptions.entries()).map(([key, sub]) => ({
            key,
            type: sub.type,
            symbol: sub.symbol,
            interval: sub.interval,
            userAddress: sub.userAddress,
            subscriberCount: sub.subscriberCount,
            lastUpdate: sub.lastUpdate,
        }));
    }
    /**
     * Clean up stale subscriptions (no updates for specified duration)
     */
    async cleanupStaleSubscriptions(maxAgeMs = 300000) {
        const now = Date.now();
        let cleanedCount = 0;
        for (const [key, subscription] of this.subscriptions.entries()) {
            const age = now - subscription.lastUpdate.getTime();
            if (age > maxAgeMs) {
                console.log(`[MarketDataService] Cleaning up stale subscription: ${key} (age: ${age}ms)`);
                try {
                    await subscription.unsubscribe();
                    this.subscriptions.delete(key);
                    cleanedCount++;
                }
                catch (error) {
                    console.error(`[MarketDataService] Error cleaning up ${key}:`, error);
                }
            }
        }
        if (cleanedCount > 0) {
            console.log(`[MarketDataService] Cleaned up ${cleanedCount} stale subscriptions`);
        }
        return cleanedCount;
    }
    /**
     * Unsubscribe from all subscriptions
     */
    async unsubscribeAll() {
        this.isShuttingDown = true;
        console.log(`[MarketDataService] Unsubscribing from all subscriptions (${this.subscriptions.size})`);
        const unsubscribePromises = Array.from(this.subscriptions.values()).map((subscription) => subscription.unsubscribe().catch((error) => {
            console.error('[MarketDataService] Error during unsubscribe:', error);
        }));
        await Promise.all(unsubscribePromises);
        this.subscriptions.clear();
        this.removeAllListeners();
        console.log('[MarketDataService] All subscriptions cleared');
    }
    /**
     * Get subscription statistics
     */
    getStats() {
        const stats = {
            totalSubscriptions: this.subscriptions.size,
            totalSubscribers: 0,
            byType: {},
        };
        for (const subscription of this.subscriptions.values()) {
            stats.totalSubscribers += subscription.subscriberCount;
            stats.byType[subscription.type] = (stats.byType[subscription.type] || 0) + 1;
        }
        return stats;
    }
}
/**
 * Singleton instance
 */
let marketDataServiceInstance = null;
/**
 * Get the singleton instance of MarketDataService
 */
export function getMarketDataService() {
    if (!marketDataServiceInstance) {
        marketDataServiceInstance = new MarketDataService();
        console.log('[MarketDataService] Instance created');
        // Set up periodic cleanup of stale subscriptions (every 5 minutes)
        setInterval(() => {
            if (marketDataServiceInstance) {
                marketDataServiceInstance.cleanupStaleSubscriptions(300000); // 5 minutes
            }
        }, 300000);
    }
    return marketDataServiceInstance;
}
/**
 * Reset the singleton instance (useful for testing)
 */
export async function resetMarketDataService() {
    if (marketDataServiceInstance) {
        await marketDataServiceInstance.unsubscribeAll();
        marketDataServiceInstance = null;
    }
}
