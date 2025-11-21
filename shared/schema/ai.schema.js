import { pgTable, uuid, varchar, timestamp, decimal, text, index } from 'drizzle-orm/pg-core';
import { users } from './users.schema.js';
export const aiTradingSignals = pgTable('ai_trading_signals', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),
    symbol: varchar('symbol', { length: 50 }).notNull(),
    action: varchar('action', { length: 20 }).notNull(), // buy, sell, hold
    confidence: decimal('confidence', { precision: 5, scale: 2 }).notNull(), // 0-100
    entryPrice: decimal('entry_price', { precision: 20, scale: 8 }),
    targetPrice: decimal('target_price', { precision: 20, scale: 8 }),
    stopLoss: decimal('stop_loss', { precision: 20, scale: 8 }),
    reasoning: text('reasoning'),
    indicators: text('indicators'), // JSON
    timeframe: varchar('timeframe', { length: 10 }), // 1h, 4h, 1d
    expiresAt: timestamp('expires_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => {
    return {
        userIdIdx: index('ai_signals_user_id_idx').on(table.userId),
        symbolIdx: index('ai_signals_symbol_idx').on(table.symbol),
    };
});
export const aiMarketAnalysis = pgTable('ai_market_analysis', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),
    symbol: varchar('symbol', { length: 50 }),
    analysisType: varchar('analysis_type', { length: 50 }).notNull(), // sentiment, trend, prediction
    summary: text('summary').notNull(),
    sentiment: varchar('sentiment', { length: 20 }), // bullish, bearish, neutral
    confidence: decimal('confidence', { precision: 5, scale: 2 }),
    data: text('data'), // JSON with detailed analysis
    createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => {
    return {
        userIdIdx: index('ai_analysis_user_id_idx').on(table.userId),
    };
});
export const aiChatHistory = pgTable('ai_chat_history', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),
    role: varchar('role', { length: 20 }).notNull(), // user, assistant, system
    content: text('content').notNull(),
    metadata: text('metadata'), // JSON
    createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => {
    return {
        userIdIdx: index('ai_chat_user_id_idx').on(table.userId),
    };
});
