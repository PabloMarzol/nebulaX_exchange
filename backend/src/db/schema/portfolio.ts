import { pgTable, uuid, varchar, decimal, timestamp, boolean, text, jsonb, integer, index, uniqueIndex } from 'drizzle-orm/pg-core';

/**
 * User Portfolios Table
 * Stores user portfolio metadata and current cash balance
 */
export const portfolios = pgTable('portfolios', {
  // Primary identifiers
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().unique(), // One portfolio per user for now

  // Portfolio details
  name: varchar('name', { length: 100 }).default('My Portfolio'),
  description: text('description'),

  // Financial data
  cashBalance: decimal('cash_balance', { precision: 20, scale: 8 }).notNull().default('0'),
  totalValue: decimal('total_value', { precision: 20, scale: 8 }).default('0'), // Cached total value

  // Performance tracking
  totalPnl: decimal('total_pnl', { precision: 20, scale: 8 }).default('0'),
  totalPnlPercent: decimal('total_pnl_percent', { precision: 10, scale: 4 }).default('0'),

  // Metadata
  currency: varchar('currency', { length: 10 }).default('USD'),
  metadata: jsonb('metadata'), // Store additional portfolio settings

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  lastAnalyzedAt: timestamp('last_analyzed_at'),
}, (table) => ({
  userIdIdx: index('portfolios_user_id_idx').on(table.userId),
}));

/**
 * Portfolio Positions Table
 * Individual asset holdings within a portfolio
 */
export const portfolioPositions = pgTable('portfolio_positions', {
  // Primary identifiers
  id: uuid('id').primaryKey().defaultRandom(),
  portfolioId: uuid('portfolio_id').notNull(),

  // Asset details
  symbol: varchar('symbol', { length: 20 }).notNull(), // BTC, ETH, SOL, etc.
  name: varchar('name', { length: 100 }), // Bitcoin, Ethereum, etc.

  // Position data
  longQuantity: decimal('long_quantity', { precision: 20, scale: 8 }).notNull().default('0'),
  shortQuantity: decimal('short_quantity', { precision: 20, scale: 8 }).notNull().default('0'),
  longCostBasis: decimal('long_cost_basis', { precision: 20, scale: 8 }).default('0'), // Average buy price
  shortCostBasis: decimal('short_cost_basis', { precision: 20, scale: 8 }).default('0'), // Average short price

  // Current market data
  currentPrice: decimal('current_price', { precision: 20, scale: 8 }),
  marketValue: decimal('market_value', { precision: 20, scale: 8 }).default('0'),

  // Performance
  unrealizedPnl: decimal('unrealized_pnl', { precision: 20, scale: 8 }).default('0'),
  realizedPnl: decimal('realized_pnl', { precision: 20, scale: 8 }).default('0'),
  totalPnl: decimal('total_pnl', { precision: 20, scale: 8 }).default('0'),
  pnlPercent: decimal('pnl_percent', { precision: 10, scale: 4 }).default('0'),

  // Additional data
  allocationPercent: decimal('allocation_percent', { precision: 10, scale: 4 }).default('0'),
  metadata: jsonb('metadata'),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  portfolioIdIdx: index('portfolio_positions_portfolio_id_idx').on(table.portfolioId),
  symbolIdx: index('portfolio_positions_symbol_idx').on(table.symbol),
  uniquePortfolioSymbol: uniqueIndex('portfolio_positions_portfolio_symbol_idx').on(table.portfolioId, table.symbol),
}));

/**
 * Investment Pies Table
 * User-created portfolio templates/strategies
 */
export const investmentPies = pgTable('investment_pies', {
  // Primary identifiers
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),

  // Pie details
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),

  // Status
  isActive: boolean('is_active').default(true),
  isPublic: boolean('is_public').default(false), // Allow sharing pies

  // Stats
  totalAllocation: decimal('total_allocation', { precision: 5, scale: 2 }).default('100'), // Should be 100
  assetCount: integer('asset_count').default(0),

  // Metadata
  tags: text('tags').array(), // e.g., ['defi', 'blue-chip', 'high-risk']
  metadata: jsonb('metadata'),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('investment_pies_user_id_idx').on(table.userId),
  isActiveIdx: index('investment_pies_is_active_idx').on(table.isActive),
}));

/**
 * Pie Assets Table
 * Individual assets within an investment pie
 */
export const pieAssets = pgTable('pie_assets', {
  // Primary identifiers
  id: uuid('id').primaryKey().defaultRandom(),
  pieId: uuid('pie_id').notNull(),

  // Asset details
  symbol: varchar('symbol', { length: 20 }).notNull(),
  name: varchar('name', { length: 100 }),

  // Allocation
  allocationPercent: decimal('allocation_percent', { precision: 5, scale: 2 }).notNull(), // 0-100

  // Display order
  sortOrder: integer('sort_order').default(0),

  // Metadata
  metadata: jsonb('metadata'),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  pieIdIdx: index('pie_assets_pie_id_idx').on(table.pieId),
  uniquePieSymbol: uniqueIndex('pie_assets_pie_symbol_idx').on(table.pieId, table.symbol),
}));

/**
 * AI Analysis Results Table
 * Stores AI portfolio analysis results
 */
export const aiAnalysisResults = pgTable('ai_analysis_results', {
  // Primary identifiers
  id: uuid('id').primaryKey().defaultRandom(),
  portfolioId: uuid('portfolio_id').notNull(),
  userId: uuid('user_id').notNull(),

  // Analysis details
  analysisType: varchar('analysis_type', { length: 50 }).default('full_portfolio'), // 'full_portfolio', 'risk_assessment', 'rebalance'
  modelName: varchar('model_name', { length: 50 }).default('llama-3.3-70b-versatile'),
  modelProvider: varchar('model_provider', { length: 50 }).default('Groq'),

  // Results
  decisions: jsonb('decisions').notNull(), // Trading decisions per asset
  sentiment: varchar('sentiment', { length: 20 }), // 'Bullish', 'Bearish', 'Neutral'
  confidenceScore: decimal('confidence_score', { precision: 5, scale: 2 }),

  // Metrics
  riskScore: decimal('risk_score', { precision: 5, scale: 2 }),
  diversificationScore: decimal('diversification_score', { precision: 5, scale: 2 }),

  // Agent signals
  agentSignals: jsonb('agent_signals'), // Individual agent recommendations

  // Processing metadata
  processingTimeMs: integer('processing_time_ms'),
  tokensUsed: integer('tokens_used'),

  // Steps completed (for tracking analysis progress)
  stepsCompleted: jsonb('steps_completed'),

  // Full response
  rawResponse: jsonb('raw_response'),
  metadata: jsonb('metadata'),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  expiresAt: timestamp('expires_at'), // Analysis validity period
}, (table) => ({
  portfolioIdIdx: index('ai_analysis_portfolio_id_idx').on(table.portfolioId),
  userIdIdx: index('ai_analysis_user_id_idx').on(table.userId),
  createdAtIdx: index('ai_analysis_created_at_idx').on(table.createdAt),
}));

/**
 * Portfolio Performance History Table
 * Track portfolio value over time for charting
 */
export const portfolioHistory = pgTable('portfolio_history', {
  // Primary identifiers
  id: uuid('id').primaryKey().defaultRandom(),
  portfolioId: uuid('portfolio_id').notNull(),

  // Snapshot data
  totalValue: decimal('total_value', { precision: 20, scale: 8 }).notNull(),
  cashBalance: decimal('cash_balance', { precision: 20, scale: 8 }).notNull(),
  positionsValue: decimal('positions_value', { precision: 20, scale: 8 }).notNull(),

  // Performance
  dailyChange: decimal('daily_change', { precision: 20, scale: 8 }),
  dailyChangePercent: decimal('daily_change_percent', { precision: 10, scale: 4 }),
  totalPnl: decimal('total_pnl', { precision: 20, scale: 8 }),
  totalPnlPercent: decimal('total_pnl_percent', { precision: 10, scale: 4 }),

  // Snapshot type
  snapshotType: varchar('snapshot_type', { length: 20 }).default('daily'), // 'hourly', 'daily', 'weekly', 'monthly'

  // Timestamp
  timestamp: timestamp('timestamp').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  portfolioIdIdx: index('portfolio_history_portfolio_id_idx').on(table.portfolioId),
  timestampIdx: index('portfolio_history_timestamp_idx').on(table.timestamp),
  portfolioTimestampIdx: uniqueIndex('portfolio_history_portfolio_timestamp_idx').on(table.portfolioId, table.timestamp),
}));
