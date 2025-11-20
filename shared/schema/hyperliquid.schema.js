import { pgTable, uuid, varchar, decimal, timestamp, boolean, text, jsonb } from 'drizzle-orm/pg-core';
/**
 * Hyperliquid Orders Table
 * Stores all orders placed through Hyperliquid integration
 */
export const hyperliquidOrders = pgTable('hyperliquid_orders', {
    // Primary identifiers
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull(), // Reference to users table
    internalOrderId: varchar('internal_order_id', { length: 64 }).notNull().unique(),
    hyperliquidOrderId: varchar('hyperliquid_order_id', { length: 128 }), // Hyperliquid's oid
    // Order details
    symbol: varchar('symbol', { length: 20 }).notNull(), // e.g., 'BTC', 'ETH'
    side: varchar('side', { length: 4 }).notNull(), // 'buy' | 'sell'
    orderType: varchar('order_type', { length: 20 }).notNull(), // 'limit' | 'market'
    // Pricing and size
    price: decimal('price', { precision: 20, scale: 8 }), // Limit price (null for market orders)
    size: decimal('size', { precision: 20, scale: 8 }).notNull(), // Order size
    filledSize: decimal('filled_size', { precision: 20, scale: 8 }).default('0'), // Amount filled
    remainingSize: decimal('remaining_size', { precision: 20, scale: 8 }), // Amount remaining
    averageFillPrice: decimal('average_fill_price', { precision: 20, scale: 8 }), // Average price of fills
    // Order parameters
    timeInForce: varchar('time_in_force', { length: 10 }), // 'Gtc' | 'Ioc' | 'Alo'
    reduceOnly: boolean('reduce_only').default(false), // If true, can only reduce position
    postOnly: boolean('post_only').default(false), // If true, order will only add liquidity
    // Status tracking
    status: varchar('status', { length: 20 }).notNull(), // 'pending' | 'open' | 'filled' | 'partially_filled' | 'cancelled' | 'failed'
    // Additional metadata
    metadata: jsonb('metadata'), // Store additional order details from Hyperliquid
    errorMessage: text('error_message'), // Error details if order failed
    // Timestamps
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    filledAt: timestamp('filled_at'), // When order was completely filled
    cancelledAt: timestamp('cancelled_at'), // When order was cancelled
});
/**
 * Hyperliquid Positions Table
 * Tracks user positions in perpetual futures
 */
export const hyperliquidPositions = pgTable('hyperliquid_positions', {
    // Primary identifiers
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull(), // Reference to users table
    symbol: varchar('symbol', { length: 20 }).notNull(), // e.g., 'BTC', 'ETH'
    // Position details
    side: varchar('side', { length: 5 }).notNull(), // 'long' | 'short'
    size: decimal('size', { precision: 20, scale: 8 }).notNull(), // Position size (contracts)
    // Pricing
    entryPrice: decimal('entry_price', { precision: 20, scale: 8 }).notNull(), // Average entry price
    markPrice: decimal('mark_price', { precision: 20, scale: 8 }), // Current mark price
    liquidationPrice: decimal('liquidation_price', { precision: 20, scale: 8 }), // Liquidation price
    // P&L
    unrealizedPnl: decimal('unrealized_pnl', { precision: 20, scale: 8 }), // Unrealized profit/loss
    realizedPnl: decimal('realized_pnl', { precision: 20, scale: 8 }).default('0'), // Realized profit/loss
    // Margin and leverage
    leverage: decimal('leverage', { precision: 5, scale: 2 }), // Leverage multiplier (e.g., 10.00 for 10x)
    marginUsed: decimal('margin_used', { precision: 20, scale: 8 }), // Margin allocated to this position
    marginMode: varchar('margin_mode', { length: 10 }), // 'cross' | 'isolated'
    // Timestamps
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    closedAt: timestamp('closed_at'), // When position was closed
});
/**
 * Hyperliquid Fills Table
 * Tracks individual order fills (executions)
 */
export const hyperliquidFills = pgTable('hyperliquid_fills', {
    // Primary identifiers
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id').notNull(), // Reference to hyperliquid_orders
    userId: uuid('user_id').notNull(), // Reference to users table
    hyperliquidFillId: varchar('hyperliquid_fill_id', { length: 128 }), // Hyperliquid's fill ID
    // Fill details
    symbol: varchar('symbol', { length: 20 }).notNull(),
    side: varchar('side', { length: 4 }).notNull(), // 'buy' | 'sell'
    price: decimal('price', { precision: 20, scale: 8 }).notNull(), // Fill price
    size: decimal('size', { precision: 20, scale: 8 }).notNull(), // Fill size
    // Fees
    fee: decimal('fee', { precision: 20, scale: 8 }), // Trading fee paid
    feeToken: varchar('fee_token', { length: 10 }), // Fee token (usually 'USDC')
    isMaker: boolean('is_maker'), // True if this was a maker order
    // Transaction details
    txHash: varchar('tx_hash', { length: 128 }), // Blockchain transaction hash
    blockNumber: varchar('block_number', { length: 20 }), // Block number
    // Additional metadata
    metadata: jsonb('metadata'), // Store additional fill details
    // Timestamp
    createdAt: timestamp('created_at').defaultNow().notNull(),
});
/**
 * Hyperliquid Reconciliations Table
 * Tracks reconciliation between our DB and Hyperliquid's API
 */
export const hyperliquidReconciliations = pgTable('hyperliquid_reconciliations', {
    // Primary identifiers
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id'), // Reference to hyperliquid_orders (nullable for position reconciliations)
    // Reconciliation details
    checkType: varchar('check_type', { length: 50 }).notNull(), // 'order_status' | 'fill' | 'position' | 'balance'
    entityType: varchar('entity_type', { length: 20 }).notNull(), // 'order' | 'position' | 'fill'
    entityId: varchar('entity_id', { length: 128 }).notNull(), // ID of the entity being reconciled
    // Status comparison
    dbStatus: varchar('db_status', { length: 50 }).notNull(), // Status in our DB
    apiStatus: varchar('api_status', { length: 50 }).notNull(), // Status from Hyperliquid API
    discrepancy: boolean('discrepancy').notNull(), // True if statuses don't match
    // Discrepancy details
    discrepancyDetails: jsonb('discrepancy_details'), // Details about the mismatch
    resolution: text('resolution'), // How the discrepancy was resolved
    resolvedAt: timestamp('resolved_at'), // When discrepancy was resolved
    // Metadata
    metadata: jsonb('metadata'), // Additional reconciliation data
    // Timestamps
    createdAt: timestamp('created_at').defaultNow().notNull(),
});
/**
 * Hyperliquid User State Cache
 * Caches user clearinghouse state from Hyperliquid
 * Reduces API calls by caching frequently accessed data
 */
export const hyperliquidUserStateCache = pgTable('hyperliquid_user_state_cache', {
    // Primary identifiers
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().unique(), // Reference to users table
    userAddress: varchar('user_address', { length: 42 }).notNull(), // User's wallet address
    // Account values
    accountValue: decimal('account_value', { precision: 20, scale: 8 }), // Total account value
    totalMarginUsed: decimal('total_margin_used', { precision: 20, scale: 8 }), // Total margin in use
    totalUnrealizedPnl: decimal('total_unrealized_pnl', { precision: 20, scale: 8 }), // Total unrealized P&L
    totalRealizedPnl: decimal('total_realized_pnl', { precision: 20, scale: 8 }), // Total realized P&L
    // Full state snapshot
    stateSnapshot: jsonb('state_snapshot'), // Full clearinghouse state from API
    // Cache metadata
    lastFetchedAt: timestamp('last_fetched_at').notNull(), // When data was last fetched
    expiresAt: timestamp('expires_at').notNull(), // When cache should be refreshed
    // Timestamps
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
