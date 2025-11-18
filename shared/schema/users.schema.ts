import { pgTable, uuid, varchar, timestamp, boolean, integer, text } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).unique(),
  walletAddress: varchar('wallet_address', { length: 255 }).unique().notNull(),
  username: varchar('username', { length: 100 }).unique(),
  firstName: varchar('first_name', { length: 100 }),
  lastName: varchar('last_name', { length: 100 }),
  kycLevel: integer('kyc_level').default(0), // 0 = none, 1 = basic, 2 = enhanced
  verified: boolean('verified').default(false),
  twoFactorSecret: varchar('two_factor_secret', { length: 64 }),
  twoFactorEnabled: boolean('two_factor_enabled').default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const authNonces = pgTable('auth_nonces', {
  id: uuid('id').primaryKey().defaultRandom(),
  walletAddress: varchar('wallet_address', { length: 255 }).notNull(),
  nonce: varchar('nonce', { length: 255 }).notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  used: boolean('used').default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  token: varchar('token', { length: 255 }).notNull().unique(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  walletAddress: varchar('wallet_address', { length: 255 }).notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  lastActiveAt: timestamp('last_active_at').notNull().defaultNow(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const userWallets = pgTable('user_wallets', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  walletAddress: varchar('wallet_address', { length: 255 }).notNull(),
  chainId: integer('chain_id').notNull(),
  isPrimary: boolean('is_primary').default(false),
  label: varchar('label', { length: 100 }),
  linkedAt: timestamp('linked_at').notNull().defaultNow(),
});
