import { pgTable, uuid, varchar, timestamp, decimal, text, integer, index } from 'drizzle-orm/pg-core';
import { users } from './users.schema.js';

export const swapOrders = pgTable(
  'swap_orders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    sellToken: varchar('sell_token', { length: 255 }).notNull(),
    buyToken: varchar('buy_token', { length: 255 }).notNull(),
    sellAmount: varchar('sell_amount', { length: 100 }).notNull(),
    buyAmount: varchar('buy_amount', { length: 100 }).notNull(),
    sellTokenSymbol: varchar('sell_token_symbol', { length: 20 }),
    buyTokenSymbol: varchar('buy_token_symbol', { length: 20 }),
    chainId: integer('chain_id').notNull(),
    price: varchar('price', { length: 50 }).notNull(),
    guaranteedPrice: varchar('guaranteed_price', { length: 50 }),
    slippage: decimal('slippage', { precision: 5, scale: 2 }).default('0.01'), // 1%
    quoteId: varchar('quote_id', { length: 255 }),
    quoteExpiry: timestamp('quote_expiry'),
    txHash: varchar('tx_hash', { length: 255 }),
    status: varchar('status', { length: 20 }).notNull().default('pending'), // pending, submitted, confirmed, failed
    error: text('error'),
    metadata: text('metadata'), // JSON
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
    confirmedAt: timestamp('confirmed_at'),
  },
  (table) => {
    return {
      userIdIdx: index('swap_orders_user_id_idx').on(table.userId),
      statusIdx: index('swap_orders_status_idx').on(table.status),
    };
  }
);

export const onrampOrders = pgTable(
  'onramp_orders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    idempotencyKey: varchar('idempotency_key', { length: 255 }).notNull().unique(),
    fiatAmount: decimal('fiat_amount', { precision: 20, scale: 2 }).notNull(),
    fiatCurrency: varchar('fiat_currency', { length: 10 }).notNull(), // USD, EUR, GBP
    cryptoAmount: decimal('crypto_amount', { precision: 20, scale: 8 }),
    cryptoCurrency: varchar('crypto_currency', { length: 20 }).notNull(), // USDT, ETH, BTC
    network: varchar('network', { length: 50 }).notNull(), // ERC20, BEP20, TRC20
    walletAddress: varchar('wallet_address', { length: 255 }).notNull(),
    paymentMethod: integer('payment_method').notNull(), // 1=card, 2=bank, etc.
    providerOrderId: varchar('provider_order_id', { length: 255 }),
    merchantRecognitionId: varchar('merchant_recognition_id', { length: 255 }).unique(),
    onrampUrl: text('onramp_url'),
    status: varchar('status', { length: 20 }).notNull().default('pending'), // pending, processing, completed, failed
    failureReason: text('failure_reason'),
    metadata: text('metadata'), // JSON
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
    completedAt: timestamp('completed_at'),
  },
  (table) => {
    return {
      userIdIdx: index('onramp_orders_user_id_idx').on(table.userId),
      statusIdx: index('onramp_orders_status_idx').on(table.status),
    };
  }
);
