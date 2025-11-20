import { getHyperliquidClient } from './HyperliquidClient';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../lib/db';
import { hyperliquidOrders } from '../../../../shared/schema/hyperliquid.schema';
import { eq, and, desc } from 'drizzle-orm';
/**
 * Order validation error
 */
export class OrderValidationError extends Error {
    code;
    constructor(message, code) {
        super(message);
        this.code = code;
        this.name = 'OrderValidationError';
    }
}
/**
 * OrderExecutionService
 *
 * Handles order placement, validation, and execution on Hyperliquid.
 *
 * Features:
 * - Pre-flight validation (balance, size, limits)
 * - Database persistence before submission
 * - Hyperliquid API integration
 * - Error handling and rollback
 * - Order status tracking
 */
export class OrderExecutionService {
    client = getHyperliquidClient();
    /**
     * Place an order on Hyperliquid
     */
    async placeOrder(params) {
        const internalOrderId = params.clientOrderId || uuidv4();
        try {
            // 1. Validate order parameters
            await this.validateOrder(params);
            // 2. Check user balance and margin
            await this.validateBalance(params);
            // 3. Save order to database with 'pending' status
            const dbOrder = await this.saveOrderToDatabase({
                ...params,
                internalOrderId,
                status: 'pending',
            });
            // 4. Submit order to Hyperliquid
            const hyperliquidResponse = await this.submitToHyperliquid(params);
            // 5. Parse response and update database
            if (hyperliquidResponse.status === 'ok') {
                const orderStatus = hyperliquidResponse.response?.data?.statuses?.[0];
                if (!orderStatus) {
                    throw new Error('Invalid response from Hyperliquid: missing order status');
                }
                // Check if order was rejected
                if (orderStatus.error) {
                    // Update order status to 'failed'
                    await this.updateOrderStatus(internalOrderId, 'failed', {
                        errorMessage: orderStatus.error,
                    });
                    return {
                        success: false,
                        internalOrderId,
                        status: 'failed',
                        error: orderStatus.error,
                        message: `Order rejected: ${orderStatus.error}`,
                    };
                }
                // Update order status to 'open' with Hyperliquid order ID
                await this.updateOrderStatus(internalOrderId, 'open', {
                    hyperliquidOrderId: orderStatus.oid,
                });
                return {
                    success: true,
                    internalOrderId,
                    hyperliquidOrderId: orderStatus.oid,
                    status: 'open',
                    message: 'Order placed successfully',
                };
            }
            else {
                // Handle error response
                const errorMessage = hyperliquidResponse.response?.toString() || 'Unknown error';
                // Update order status to 'failed'
                await this.updateOrderStatus(internalOrderId, 'failed', {
                    errorMessage,
                });
                return {
                    success: false,
                    internalOrderId,
                    status: 'failed',
                    error: errorMessage,
                    message: `Order failed: ${errorMessage}`,
                };
            }
        }
        catch (error) {
            console.error('[OrderExecutionService] Order placement failed:', error);
            // Try to update database status if possible
            try {
                await this.updateOrderStatus(internalOrderId, 'failed', {
                    errorMessage: error.message,
                });
            }
            catch (dbError) {
                console.error('[OrderExecutionService] Failed to update order status in DB:', dbError);
            }
            return {
                success: false,
                internalOrderId,
                status: 'failed',
                error: error.message,
                message: error instanceof OrderValidationError
                    ? error.message
                    : 'Order placement failed',
            };
        }
    }
    /**
     * Cancel an order
     */
    async cancelOrder(params) {
        try {
            // Get order from database to get Hyperliquid order ID
            const order = await this.getOrderByInternalId(params.orderId);
            if (!order) {
                return {
                    success: false,
                    error: 'Order not found',
                };
            }
            if (!order.hyperliquidOrderId) {
                return {
                    success: false,
                    error: 'Order has no Hyperliquid order ID (may not be submitted yet)',
                };
            }
            if (order.status !== 'open') {
                return {
                    success: false,
                    error: `Order cannot be cancelled (current status: ${order.status})`,
                };
            }
            // Cancel on Hyperliquid
            const response = await this.client.cancelOrder(order.hyperliquidOrderId, params.symbol);
            if (response.status === 'ok') {
                // Update database status
                await this.updateOrderStatus(params.orderId, 'cancelled');
                return {
                    success: true,
                    message: 'Order cancelled successfully',
                };
            }
            else {
                return {
                    success: false,
                    error: 'Failed to cancel order on Hyperliquid',
                };
            }
        }
        catch (error) {
            console.error('[OrderExecutionService] Order cancellation failed:', error);
            return {
                success: false,
                error: error.message,
            };
        }
    }
    /**
     * Cancel all orders for a symbol
     */
    async cancelAllOrders(params) {
        try {
            // Get all open orders for this user and symbol
            const openOrders = await this.getUserOpenOrders(params.userId);
            const ordersToCancel = openOrders.filter(order => order.symbol === params.symbol);
            if (ordersToCancel.length === 0) {
                return {
                    success: true,
                    cancelledCount: 0,
                    message: `No open orders to cancel for ${params.symbol}`,
                };
            }
            // Cancel on Hyperliquid
            const response = await this.client.cancelAllOrders(params.symbol);
            if (response.status === 'ok') {
                // Update all orders in database to cancelled
                await Promise.all(ordersToCancel.map(order => this.updateOrderStatus(order.internalOrderId, 'cancelled')));
                return {
                    success: true,
                    cancelledCount: ordersToCancel.length,
                    message: `All orders cancelled for ${params.symbol}`,
                };
            }
            else {
                return {
                    success: false,
                    error: 'Failed to cancel orders on Hyperliquid',
                };
            }
        }
        catch (error) {
            console.error('[OrderExecutionService] Cancel all orders failed:', error);
            return {
                success: false,
                error: error.message,
            };
        }
    }
    /**
     * Validate order parameters
     */
    async validateOrder(params) {
        // Validate symbol
        if (!params.symbol || typeof params.symbol !== 'string' || params.symbol.length === 0) {
            throw new OrderValidationError('Invalid symbol', 'INVALID_SYMBOL');
        }
        // Validate side
        if (!params.side || !['buy', 'sell'].includes(params.side)) {
            throw new OrderValidationError('Invalid order side. Must be "buy" or "sell"', 'INVALID_SIDE');
        }
        // Validate order type
        if (!params.orderType || !['limit', 'market'].includes(params.orderType)) {
            throw new OrderValidationError('Invalid order type. Must be "limit" or "market"', 'INVALID_ORDER_TYPE');
        }
        // Validate size
        if (!params.size || params.size <= 0) {
            throw new OrderValidationError('Order size must be positive', 'INVALID_SIZE');
        }
        // Validate price for limit orders
        if (params.orderType === 'limit') {
            if (!params.price || params.price <= 0) {
                throw new OrderValidationError('Limit orders must have a positive price', 'INVALID_PRICE');
            }
        }
        // Validate timeInForce
        if (params.timeInForce && !['Gtc', 'Ioc', 'Alo'].includes(params.timeInForce)) {
            throw new OrderValidationError('Invalid timeInForce. Must be "Gtc", "Ioc", or "Alo"', 'INVALID_TIF');
        }
        // Validate user address format
        if (!params.userAddress || !params.userAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
            throw new OrderValidationError('Invalid user address', 'INVALID_ADDRESS');
        }
        // Check for minimum order sizes (these would come from Hyperliquid API in production)
        const minSizes = {
            'BTC': 0.001,
            'ETH': 0.01,
            'SOL': 0.1,
            // Add more symbols as needed
        };
        const minSize = minSizes[params.symbol];
        if (minSize && params.size < minSize) {
            throw new OrderValidationError(`Minimum order size for ${params.symbol} is ${minSize}`, 'SIZE_TOO_SMALL');
        }
    }
    /**
     * Validate user has sufficient balance
     */
    async validateBalance(params) {
        try {
            // Get user state from Hyperliquid
            const userState = await this.client.getUserState(params.userAddress);
            // Extract account value and margin used
            const accountValue = parseFloat(userState.marginSummary.accountValue);
            const marginUsed = parseFloat(userState.marginSummary.totalMarginUsed);
            const availableMargin = accountValue - marginUsed;
            // Estimate margin required for this order
            // For perpetuals, margin requirement depends on leverage
            // This is a simplified calculation - actual margin calculation is more complex
            const orderValue = params.orderType === 'limit'
                ? (params.price || 0) * params.size
                : 0; // For market orders, we'd need current price
            // Assume 10x leverage (10% margin requirement)
            const estimatedMarginRequired = orderValue * 0.1;
            // Check if user has sufficient margin
            if (estimatedMarginRequired > availableMargin) {
                throw new OrderValidationError(`Insufficient margin. Available: $${availableMargin.toFixed(2)}, Required: $${estimatedMarginRequired.toFixed(2)}`, 'INSUFFICIENT_MARGIN');
            }
            // Check for reduce-only orders
            if (params.reduceOnly) {
                // Verify user has an opposite position to reduce
                const positions = userState.assetPositions;
                const position = positions.find((p) => p.position.coin === params.symbol);
                if (!position) {
                    throw new OrderValidationError('No position to reduce', 'NO_POSITION');
                }
                const positionSize = parseFloat(position.position.szi);
                const isLong = positionSize > 0;
                const isShort = positionSize < 0;
                // Reduce-only buy order should reduce a short position
                // Reduce-only sell order should reduce a long position
                if (params.side === 'buy' && !isShort) {
                    throw new OrderValidationError('Reduce-only buy order requires a short position', 'INVALID_REDUCE_ONLY');
                }
                if (params.side === 'sell' && !isLong) {
                    throw new OrderValidationError('Reduce-only sell order requires a long position', 'INVALID_REDUCE_ONLY');
                }
                // Check size doesn't exceed position size
                if (params.size > Math.abs(positionSize)) {
                    throw new OrderValidationError(`Order size (${params.size}) exceeds position size (${Math.abs(positionSize)})`, 'SIZE_EXCEEDS_POSITION');
                }
            }
        }
        catch (error) {
            if (error instanceof OrderValidationError) {
                throw error;
            }
            // If we can't get user state, log warning but don't block order
            // (Hyperliquid will do its own validation)
            console.warn('[OrderExecutionService] Could not validate balance:', error.message);
        }
    }
    /**
     * Submit order to Hyperliquid
     */
    async submitToHyperliquid(params) {
        const orderRequest = {
            coin: params.symbol,
            isBuy: params.side === 'buy',
            price: params.price || 0, // Market orders use 0
            size: params.size,
            orderType: params.orderType,
            timeInForce: params.timeInForce,
            reduceOnly: params.reduceOnly,
        };
        console.log('[OrderExecutionService] Submitting order to Hyperliquid:', {
            symbol: params.symbol,
            side: params.side,
            type: params.orderType,
            price: params.price,
            size: params.size,
        });
        return await this.client.placeOrder(orderRequest);
    }
    /**
     * Get order size limits for a symbol
     */
    async getOrderLimits(symbol) {
        try {
            // Get symbol metadata from Hyperliquid
            const metas = await this.client.getAllMetas();
            const symbolMeta = metas.universe.find((m) => m.name === symbol);
            if (!symbolMeta) {
                throw new Error(`Symbol ${symbol} not found`);
            }
            // Return limits based on symbol metadata
            return {
                minSize: 0.001, // This would come from symbolMeta
                maxSize: 1000000, // This would come from symbolMeta
                sizeIncrement: Math.pow(10, -symbolMeta.szDecimals),
                priceIncrement: 0.01, // This would come from symbolMeta
            };
        }
        catch (error) {
            console.error('[OrderExecutionService] Failed to get order limits:', error);
            throw error;
        }
    }
    /**
     * Save order to database
     */
    async saveOrderToDatabase(params) {
        const newOrder = {
            userId: params.userId,
            internalOrderId: params.internalOrderId,
            symbol: params.symbol,
            side: params.side,
            orderType: params.orderType,
            price: params.price?.toString(),
            size: params.size.toString(),
            remainingSize: params.size.toString(),
            timeInForce: params.timeInForce,
            reduceOnly: params.reduceOnly,
            postOnly: params.postOnly,
            status: params.status,
            filledSize: '0',
        };
        try {
            const [order] = await db.insert(hyperliquidOrders).values(newOrder).returning();
            console.log(`[OrderExecutionService] Order saved to database: ${params.internalOrderId}`);
            return order;
        }
        catch (error) {
            console.error('[OrderExecutionService] Failed to save order to database:', error);
            throw new Error(`Database error: ${error.message}`);
        }
    }
    /**
     * Update order status in database
     */
    async updateOrderStatus(internalOrderId, status, updates = {}) {
        try {
            const updateData = {
                status,
                updatedAt: new Date(),
            };
            if (updates.hyperliquidOrderId) {
                updateData.hyperliquidOrderId = updates.hyperliquidOrderId;
            }
            if (updates.filledSize) {
                updateData.filledSize = updates.filledSize;
            }
            if (updates.remainingSize) {
                updateData.remainingSize = updates.remainingSize;
            }
            if (updates.averageFillPrice) {
                updateData.averageFillPrice = updates.averageFillPrice;
            }
            if (updates.errorMessage) {
                updateData.errorMessage = updates.errorMessage;
            }
            // Add filled/cancelled timestamps
            if (status === 'filled') {
                updateData.filledAt = new Date();
            }
            else if (status === 'cancelled') {
                updateData.cancelledAt = new Date();
            }
            await db
                .update(hyperliquidOrders)
                .set(updateData)
                .where(eq(hyperliquidOrders.internalOrderId, internalOrderId));
            console.log(`[OrderExecutionService] Order status updated: ${internalOrderId} -> ${status}`);
        }
        catch (error) {
            console.error('[OrderExecutionService] Failed to update order status:', error);
            throw new Error(`Database error: ${error.message}`);
        }
    }
    /**
     * Get order by internal order ID
     */
    async getOrderByInternalId(internalOrderId) {
        try {
            const [order] = await db
                .select()
                .from(hyperliquidOrders)
                .where(eq(hyperliquidOrders.internalOrderId, internalOrderId))
                .limit(1);
            return order || null;
        }
        catch (error) {
            console.error('[OrderExecutionService] Failed to get order:', error);
            throw new Error(`Database error: ${error.message}`);
        }
    }
    /**
     * Get orders for a user
     */
    async getUserOrders(userId, limit = 100) {
        try {
            const orders = await db
                .select()
                .from(hyperliquidOrders)
                .where(eq(hyperliquidOrders.userId, userId))
                .orderBy(desc(hyperliquidOrders.createdAt))
                .limit(limit);
            return orders;
        }
        catch (error) {
            console.error('[OrderExecutionService] Failed to get user orders:', error);
            throw new Error(`Database error: ${error.message}`);
        }
    }
    /**
     * Get open orders for a user
     */
    async getUserOpenOrders(userId) {
        try {
            const orders = await db
                .select()
                .from(hyperliquidOrders)
                .where(and(eq(hyperliquidOrders.userId, userId), eq(hyperliquidOrders.status, 'open')))
                .orderBy(desc(hyperliquidOrders.createdAt));
            return orders;
        }
        catch (error) {
            console.error('[OrderExecutionService] Failed to get user open orders:', error);
            throw new Error(`Database error: ${error.message}`);
        }
    }
    /**
     * Estimate order fees
     */
    estimateFees(params) {
        // Hyperliquid fee structure (simplified)
        const makerFeeRate = 0.00025; // 0.025%
        const takerFeeRate = 0.00035; // 0.035%
        const feeRate = params.isMaker ? makerFeeRate : takerFeeRate;
        const orderValue = params.price * params.size;
        const estimatedFee = orderValue * feeRate;
        return {
            feeRate,
            estimatedFee,
        };
    }
}
/**
 * Singleton instance
 */
let orderExecutionServiceInstance = null;
/**
 * Get the singleton instance of OrderExecutionService
 */
export function getOrderExecutionService() {
    if (!orderExecutionServiceInstance) {
        orderExecutionServiceInstance = new OrderExecutionService();
        console.log('[OrderExecutionService] Instance created');
    }
    return orderExecutionServiceInstance;
}
/**
 * Reset the singleton instance (useful for testing)
 */
export function resetOrderExecutionService() {
    orderExecutionServiceInstance = null;
}
