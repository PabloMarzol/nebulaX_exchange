import { pgTable, uuid, varchar, timestamp, decimal, text, integer, index } from 'drizzle-orm/pg-core';
import { users } from './users.schema.js';

export const orders = pgTable(
  'orders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    symbol: varchar('symbol', { length: 50 }).notNull(), // BTC/USDT
    side: varchar('side', { length: 10 }).notNull(), // buy, sell
    type: varchar('type', { length: 20 }).notNull(), // market, limit, stop
    amount: decimal('amount', { precision: 20, scale: 8 }).notNull(),
    price: decimal('price', { precision: 20, scale: 8 }),
    stopPrice: decimal('stop_price', { precision: 20, scale: 8 }),
    filledAmount: decimal('filled_amount', { precision: 20, scale: 8 }).default('0'),
    status: varchar('status', { length: 20 }).notNull().default('pending'), // pending, filled, partial, cancelled, failed
    nonce: integer('nonce').notNull(),
    providerOrderId: varchar('provider_order_id', { length: 255 }),
    providerStatus: varchar('provider_status', { length: 50 }),
    chainTxHash: varchar('chain_tx_hash', { length: 255 }),
    error: text('error'),
    metadata: text('metadata'), // JSON
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
    finalizedAt: timestamp('finalized_at'),
  },
  (table) => {
    return {
      userIdIdx: index('orders_user_id_idx').on(table.userId),
      symbolIdx: index('orders_symbol_idx').on(table.symbol),
      statusIdx: index('orders_status_idx').on(table.status),
    };
  }
);

export const trades = pgTable(
  'trades',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    symbol: varchar('symbol', { length: 50 }).notNull(),
    side: varchar('side', { length: 10 }).notNull(),
    price: decimal('price', { precision: 20, scale: 8 }).notNull(),
    amount: decimal('amount', { precision: 20, scale: 8 }).notNull(),
    fee: decimal('fee', { precision: 20, scale: 8 }).default('0'),
    feeCurrency: varchar('fee_currency', { length: 20 }),
    chainTxHash: varchar('chain_tx_hash', { length: 255 }),
    tradeId: varchar('trade_id', { length: 255 }), // External trade ID
    executedAt: timestamp('executed_at').notNull().defaultNow(),
  },
  (table) => {
    return {
      userIdIdx: index('trades_user_id_idx').on(table.userId),
      symbolIdx: index('trades_symbol_idx').on(table.symbol),
    };
  }
);

export const positions = pgTable(
  'positions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    symbol: varchar('symbol', { length: 50 }).notNull(),
    side: varchar('side', { length: 10 }).notNull(), // long, short
    amount: decimal('amount', { precision: 20, scale: 8 }).notNull(),
    entryPrice: decimal('entry_price', { precision: 20, scale: 8 }).notNull(),
    liquidationPrice: decimal('liquidation_price', { precision: 20, scale: 8 }),
    leverage: decimal('leverage', { precision: 5, scale: 2 }).default('1'),
    unrealizedPnl: decimal('unrealized_pnl', { precision: 20, scale: 8 }).default('0'),
    realizedPnl: decimal('realized_pnl', { precision: 20, scale: 8 }).default('0'),
    status: varchar('status', { length: 20 }).notNull().default('open'), // open, closed
    openedAt: timestamp('opened_at').notNull().defaultNow(),
    closedAt: timestamp('closed_at'),
  },
  (table) => {
    return {
      userIdIdx: index('positions_user_id_idx').on(table.userId),
      statusIdx: index('positions_status_idx').on(table.status),
    };
  }
);
