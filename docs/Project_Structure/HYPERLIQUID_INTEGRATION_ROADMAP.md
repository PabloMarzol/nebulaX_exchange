Hyperliquid Integration Roadmap (Non-Custodial DEX)
Phase 0 – Research & Foundations (1 week)

Deep-dive into official docs & SDKs
Study: https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api
Key sections: Signing spec, Nonces (per-signer), Exchange/Info endpoints, WebSocket (POST subscriptions), Rate limits, Exact JSON serialization rules, Testnet vs Mainnet URLs
Test official Python/TS SDKs and top community ones (nktkas/hyperliquid, nomeida/hyperliquid)
Confirm testnet is fully functional: https://api.hyperliquid-testnet.xyz + app.hyperliquid-testnet.xyz

Lock non-custodial policy (mandatory)
HL private keys/seeds never touch servers
All signing happens in-browser with user-controlled keys
Document & enforce in code reviews + CI

Define MVP scope & SLAs
Initial markets: BTC-PERP, ETH-PERP, major alts
Target latency: <300ms order submit → HL acceptance
Concurrency: 100–500 active traders at launch

Security & compliance kickoff
Threat model focus: replay attacks, nonce loss, serialization bugs, auth bypass
Choose KMS/HSM only for any operational relayer keys (not user keys)


Phase 1 – Architecture & Core Contracts (2–4 days)

Final architecture
Frontend (React/TS) → API Gateway → Auth/Order Service → Relayer → Hyperliquid
Market Data Service + Ledger (Postgres) + Analytics (ClickHouse) + Message bus (Kafka/NATS/Redis Streams)

Message bus topics & idempotency
orders.created, orders.updated, fills, ledger.entries, etc.
Every message: correlation_id, causation_id, idempotency_key

Canonical JSON serializer (critical!)
Build & heavily test a serializer that produces byte-for-byte identical payloads to what HL expects (no trailing zeros, exact field order, stringified numbers, etc.)
Write 100+ golden tests against real HL examples


Phase 2 – Frontend: Wallet & Hyperliquid Key Management (1.5–2 sprints)
Goal: Users connect EVM wallet → create/import HL trading key locally → all signing in browser.

EVM wallet connection (MetaMask, WalletConnect, etc.) + SIWE authentication
Hyperliquid key UX
Generate new Ed25519 keypair in browser OR import existing seed/phrase
Require user-provided passphrase → encrypt private key with AES-GCM → store in IndexedDB
Explicit backup/export flow + scary warnings
“Lock wallet” / passphrase re-entry on sensitive actions

Signing flow
Use official or battle-tested TS utils for HL-style signing
Always show clear sign dialog: “Placing 0.5 BTC-PERP Long @ $68,420 limit”


Phase 3 – Backend Auth & Session (4–6 days)
Goal: Prove user controls an HL public key without ever seeing the private key.

Auth endpoint
User signs a server-provided challenge/nonce with their HL private key
Backend verifies signature → issues short-lived JWT (10–15 min) scoped only to order routing

Nonce & replay protection for auth
Track used auth nonces per pubkey (Redis + Postgres audit)

Session → pubkey → user_id mapping (Redis hot path)

Phase 4 – Market Data & User Feeds (2–3 sprints)

Connect to HL WebSocket (mainnet & testnet)
Subscribe to L2 book, trades, user orders/fills/positions (signed subscriptions)
Handle WS POST requests for auth

Fan-out internally
Republish to internal bus + Redis cache (top-of-book, last price, user positions)

Connection resilience
Pooling, exponential backoff, auto-reconnect with full state resub


Phase 5 – Order Submission Path (2 sprints)

Frontend
Build order ticket → construct HL payload → user signs in browser → POST signed payload + sig + JWT to your /orders endpoint

Order Service (backend)
Validate JWT + HL signature
Business-rule checks (size/price ticks from HL meta, leverage caps, user risk limits)
Re-serialize payload with canonical serializer (defense in depth)
Insert pending order record → publish orders.created

Relayer
Consume orders.created → POST to https://api.hyperliquid.xyz/exchange (or WS)
Per-signer nonce management (durable Redis/Postgres – critical to never reuse/lose nonces)
Global & per-user rate limiting + circuit breaker
Idempotency via your idempotency_key + HL order response tracking
Retry transient failures, queue on rate limits

Real-time feedback
Push orders.updated / fills via your own WS to frontend


Phase 6 – Ledger, Reconciliation & Analytics (1–2 sprints)

Immutable ledger in Postgres
Append-only entries for fills, deposits/withdrawals

Reconciler
Continuously compare HL user state (positions, margin, PnL) vs your ledger
Divergence alerts

Analytics
Stream fills → ClickHouse for PnL dashboards (mirror HL’s authoritative PnL)


Phase 7 – Operational Hardening (ongoing, start early)

Enforce “no private key on server” everywhere (CI lint + reviews)
Rate-limit monitoring dashboard (approaching HL global limits → alert)
Comprehensive logging + correlation IDs → SIEM
Daily transfer/withdrawal caps (if you ever add bridging)

Phase 8 – Testing Matrix (run continuously, gate production)

Unit: signing, serialization, nonce logic
Integration: full flow on Hyperliquid testnet (mandatory – testnet is excellent)
Chaos: WS disconnects, rate-limit simulation, nonce gaps
Load: 1000+ orders/min bursts
Security review / light pentest on auth & order endpoints

Phase 9 – Monitoring & Incident Response (build before launch)

Dashboards: HL connection health, relayer queue depth, rejection rates, reconciliation diff
Critical alerts + runbooks (e.g., “HL WS down → switch to read-only mode”)

Recommended Launch Order

Get basic market data + read-only balances working (no trading)
Add testnet trading with a few internal users
Dogfood on mainnet with tiny sizes
Gradual public rollout
# Hyperliquid Integration Roadmap

**Version:** 1.0
**Last Updated:** 2025-11-18
**Status:** Planning Phase

---

## Table of Contents

1. [Overview](#overview)
2. [Integration Architecture](#integration-architecture)
3. [Prerequisites](#prerequisites)
4. [Implementation Phases](#implementation-phases)
5. [API Client Setup](#api-client-setup)
6. [WebSocket Subscriptions](#websocket-subscriptions)
7. [Order Management Flow](#order-management-flow)
8. [Testing Strategy](#testing-strategy)
9. [Security Considerations](#security-considerations)
10. [Fallback & Error Handling](#fallback--error-handling)
11. [Monitoring & Observability](#monitoring--observability)

---

## Overview

### What is Hyperliquid?

Hyperliquid is a fully on-chain order book DEX for perpetual futures trading. It provides:

- **On-chain Central Limit Order Book (CLOB)** with sub-second finality
- **Perpetual futures** trading with up to 50x leverage
- **Deep liquidity** across multiple trading pairs
- **Low fees** and competitive spreads
- **WebSocket subscriptions** for real-time market data
- **API wallet system** for secure bot trading

### Why Integrate Hyperliquid?

✅ **Avoid Building Matching Engine**: No need to build/maintain complex order matching logic
✅ **Instant Liquidity**: Access existing market depth and liquidity pools
✅ **Advanced Order Types**: Support for limit, market, IOC, post-only orders
✅ **Real-time Data**: WebSocket feeds for orderbook, trades, and user events
✅ **TypeScript SDK**: Official support via `@nktkas/hyperliquid` package

### Integration Goals

1. Enable users to trade perpetual futures directly from NebulAX
2. Display real-time orderbook and market data
3. Provide seamless order placement and management
4. Implement robust error handling and fallback mechanisms
5. Maintain security through API wallet isolation

---

## Integration Architecture

### System Design

```
┌─────────────────────────────────────────────────────────────┐
│                      NebulAX Frontend                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Trading    │  │  Orderbook   │  │    Chart     │     │
│  │   Interface  │  │   Display    │  │   Component  │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
│         │                  │                  │             │
│         └──────────────────┴──────────────────┘             │
│                            │                                │
│                     React Query                             │
│                            │                                │
└────────────────────────────┼────────────────────────────────┘
                             │
                      API Gateway
                             │
┌────────────────────────────┼────────────────────────────────┐
│                  NebulAX Backend (Express)                   │
│                            │                                │
│  ┌─────────────────────────▼──────────────────────────┐    │
│  │       Hyperliquid Service (Trading Logic)          │    │
│  │  ┌──────────────┐  ┌──────────────────────────┐   │    │
│  │  │ OrderService │  │ MarketDataService       │   │    │
│  │  └──────┬───────┘  └──────┬──────────────────┘   │    │
│  │         │                  │                       │    │
│  │  ┌──────▼──────────────────▼─────────────────┐   │    │
│  │  │    HyperliquidClient (API Wrapper)        │   │    │
│  │  │  - InfoClient (queries)                   │   │    │
│  │  │  - ExchangeClient (trading)               │   │    │
│  │  │  - SubscriptionClient (WebSocket)         │   │    │
│  │  └──────┬────────────────────────────────────┘   │    │
│  └─────────┼────────────────────────────────────────┘    │
│            │                                              │
│  ┌─────────▼────────────────────────────────────────┐    │
│  │         Circuit Breaker & Fallback               │    │
│  │  - Rate limiter                                  │    │
│  │  - Retry logic with exponential backoff         │    │
│  │  - Fallback to 0x for market orders             │    │
│  └──────────────────────────────────────────────────┘    │
│                                                           │
│  ┌────────────────────────────────────────────────────┐  │
│  │            PostgreSQL Database                     │  │
│  │  - Order records                                   │  │
│  │  - Reconciliation logs                             │  │
│  │  - User positions                                  │  │
│  └────────────────────────────────────────────────────┘  │
└───────────────────────────┬───────────────────────────────┘
                            │
                  ┌─────────▼──────────┐
                  │  Hyperliquid API   │
                  │  ┌──────────────┐  │
                  │  │ Info API     │  │
                  │  │ Exchange API │  │
                  │  │ WebSocket    │  │
                  │  └──────────────┘  │
                  └────────────────────┘
```

### Data Flow

#### Order Placement Flow
```
User → Frontend → Backend API → HyperliquidClient → Hyperliquid API
                                      ↓
                               PostgreSQL (record)
                                      ↓
                           WebSocket subscription ← Order status updates
                                      ↓
                              Frontend (update UI)
```

#### Market Data Flow
```
Hyperliquid WebSocket → SubscriptionClient → LiveDataContext → Frontend
                              ↓
                        PostgreSQL (optional cache)
```

---

## Prerequisites

### 1. npm Packages

```bash
# Install Hyperliquid SDK
pnpm add @nktkas/hyperliquid

# Install peer dependencies (if not already installed)
pnpm add viem ethers
```

### 2. Environment Variables

Add to `.env`:

```bash
# Hyperliquid Configuration
HYPERLIQUID_TESTNET=true                           # Set to false for mainnet
HYPERLIQUID_WALLET=0x...                          # Main wallet address
HYPERLIQUID_API_PRIVATE_KEY=0x...                 # API wallet private key (NOT main wallet!)
HYPERLIQUID_MAINNET_URL=https://api.hyperliquid.xyz
HYPERLIQUID_TESTNET_URL=https://api.hyperliquid-testnet.xyz
HYPERLIQUID_WS_MAINNET_URL=wss://api.hyperliquid.xyz/ws
HYPERLIQUID_WS_TESTNET_URL=wss://api.hyperliquid-testnet.xyz/ws
```

### 3. Hyperliquid Account Setup

**Step 1: Create Main Account**
- Visit https://app.hyperliquid.xyz
- Connect your main wallet (e.g., MetaMask)
- Complete any required verification

**Step 2: Create API Wallet**
- Navigate to https://app.hyperliquid.xyz/API
- Click "Create API Key"
- Generate a new API wallet (separate from main wallet)
- Save the private key securely (this goes in `HYPERLIQUID_API_PRIVATE_KEY`)
- Authorize the API wallet to trade on behalf of your main account

**Step 3: Deposit Funds (Testnet)**
- Use testnet faucet if available
- Or bridge test USDC to Hyperliquid testnet

### 4. Database Schema

Add to Drizzle schema:

```typescript
// db/schema/hyperliquid.ts
export const hyperliquidOrders = pgTable('hyperliquid_orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  internalOrderId: varchar('internal_order_id', { length: 64 }).notNull().unique(),
  hyperliquidOrderId: varchar('hyperliquid_order_id', { length: 128 }),
  symbol: varchar('symbol', { length: 20 }).notNull(),
  side: varchar('side', { length: 4 }).notNull(), // 'buy' | 'sell'
  orderType: varchar('order_type', { length: 20 }).notNull(), // 'limit' | 'market'
  price: decimal('price', { precision: 20, scale: 8 }),
  size: decimal('size', { precision: 20, scale: 8 }).notNull(),
  status: varchar('status', { length: 20 }).notNull(), // 'pending' | 'open' | 'filled' | 'cancelled' | 'failed'
  filledSize: decimal('filled_size', { precision: 20, scale: 8 }).default('0'),
  averageFillPrice: decimal('average_fill_price', { precision: 20, scale: 8 }),
  remainingSize: decimal('remaining_size', { precision: 20, scale: 8 }),
  timeInForce: varchar('time_in_force', { length: 10 }), // 'Gtc' | 'Ioc' | 'Alo'
  reduceOnly: boolean('reduce_only').default(false),
  metadata: jsonb('metadata'), // Store additional order details
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const hyperliquidPositions = pgTable('hyperliquid_positions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  symbol: varchar('symbol', { length: 20 }).notNull(),
  side: varchar('side', { length: 5 }).notNull(), // 'long' | 'short'
  size: decimal('size', { precision: 20, scale: 8 }).notNull(),
  entryPrice: decimal('entry_price', { precision: 20, scale: 8 }).notNull(),
  markPrice: decimal('mark_price', { precision: 20, scale: 8 }),
  liquidationPrice: decimal('liquidation_price', { precision: 20, scale: 8 }),
  unrealizedPnl: decimal('unrealized_pnl', { precision: 20, scale: 8 }),
  leverage: decimal('leverage', { precision: 5, scale: 2 }),
  marginUsed: decimal('margin_used', { precision: 20, scale: 8 }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const hyperliquidReconciliations = pgTable('hyperliquid_reconciliations', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id').notNull().references(() => hyperliquidOrders.id),
  checkType: varchar('check_type', { length: 50 }).notNull(), // 'status' | 'fill' | 'cancel'
  dbStatus: varchar('db_status', { length: 20 }).notNull(),
  apiStatus: varchar('api_status', { length: 20 }).notNull(),
  discrepancy: boolean('discrepancy').notNull(),
  resolution: text('resolution'),
  createdAt: timestamp('created_at').defaultNow(),
});
```

---

## Implementation Phases

### Phase 1: Core Infrastructure (Week 1)

**Goal:** Set up basic Hyperliquid client and authentication

- [ ] Install `@nktkas/hyperliquid` SDK
- [ ] Create `backend/services/hyperliquid/HyperliquidClient.ts`
- [ ] Implement Info API queries (market data, user positions)
- [ ] Add environment variable configuration
- [ ] Create database schema and migrations
- [ ] Write unit tests for client initialization

**Deliverables:**
- Working Hyperliquid client that can query basic market data
- Database schema for orders and positions
- Environment configuration

---

### Phase 2: Market Data Integration (Week 2)

**Goal:** Display real-time market data from Hyperliquid

- [ ] Implement WebSocket subscription client
- [ ] Subscribe to orderbook (L2Book) updates
- [ ] Subscribe to trades stream
- [ ] Subscribe to candle data
- [ ] Create `MarketDataService` to manage subscriptions
- [ ] Add caching layer (Redis or in-memory)
- [ ] Implement reconnection logic with exponential backoff
- [ ] Build frontend components to display orderbook

**Deliverables:**
- Real-time orderbook display
- Trade history feed
- Price charts with live updates
- Stable WebSocket connection management

---

### Phase 3: Order Placement (Week 3)

**Goal:** Enable users to place and manage orders

- [ ] Implement `ExchangeClient` for order placement
- [ ] Create `OrderExecutionService` with business logic
- [ ] Support order types: limit, market, IOC, post-only
- [ ] Implement order validation (balance, size limits)
- [ ] Save orders to PostgreSQL before submitting
- [ ] Handle order submission to Hyperliquid
- [ ] Subscribe to user order updates via WebSocket
- [ ] Update order status in database on fills/cancellations
- [ ] Build frontend order placement interface

**Deliverables:**
- Users can place limit and market orders
- Order status updates in real-time
- Order history visible in UI
- Transaction records in database

---

### Phase 4: Position Management (Week 4)

**Goal:** Track and display user positions

- [ ] Query user positions from Hyperliquid
- [ ] Save positions to PostgreSQL
- [ ] Calculate unrealized P&L
- [ ] Display liquidation prices
- [ ] Implement position close functionality
- [ ] Add reduce-only order support
- [ ] Show margin usage and leverage
- [ ] Build position dashboard UI

**Deliverables:**
- Real-time position tracking
- P&L calculations
- Position management interface
- Liquidation alerts

---

### Phase 5: Error Handling & Resilience (Week 5)

**Goal:** Implement robust error handling and fallback mechanisms

- [ ] Create `CircuitBreaker` class for Hyperliquid API
- [ ] Implement retry logic with exponential backoff
- [ ] Add rate limiting middleware
- [ ] Build order reconciliation system
- [ ] Schedule periodic reconciliation jobs (every 5 minutes)
- [ ] Log discrepancies and alert ops team
- [ ] Implement fallback routing to 0x for market orders
- [ ] Add error notifications to frontend

**Deliverables:**
- Circuit breaker prevents cascading failures
- Automatic retry on transient errors
- Order reconciliation catches discrepancies
- Graceful degradation when Hyperliquid is unavailable

---

### Phase 6: Testing & Optimization (Week 6)

**Goal:** Comprehensive testing and performance optimization

- [ ] Write unit tests for all services
- [ ] Write integration tests for order flow
- [ ] Perform load testing on WebSocket subscriptions
- [ ] Test failure scenarios (API down, WebSocket disconnect)
- [ ] Optimize database queries
- [ ] Add query result caching
- [ ] Implement request batching where possible
- [ ] Performance monitoring and logging

**Deliverables:**
- 80%+ test coverage
- Load test results
- Performance benchmarks
- Comprehensive error logs

---

### Phase 7: Production Readiness (Week 7)

**Goal:** Prepare for production deployment

- [ ] Security audit of API key management
- [ ] Set up production environment variables
- [ ] Configure mainnet Hyperliquid connection
- [ ] Implement rate limit monitoring
- [ ] Set up alerting (PagerDuty, Slack)
- [ ] Create runbooks for common issues
- [ ] Write user documentation
- [ ] Perform final QA testing
- [ ] Deploy to staging environment
- [ ] Gradual rollout to production (10% → 50% → 100%)

**Deliverables:**
- Production-ready Hyperliquid integration
- Monitoring dashboards
- Incident response procedures
- User documentation

---

## API Client Setup

### HyperliquidClient Implementation

Create `backend/services/hyperliquid/HyperliquidClient.ts`:

```typescript
import { Hyperliquid, HttpTransport, WebSocketTransport, InfoClient, ExchangeClient, SubscriptionClient } from '@nktkas/hyperliquid';

interface HyperliquidConfig {
  testnet: boolean;
  walletAddress: string;
  apiPrivateKey: string;
}

export class HyperliquidClient {
  private config: HyperliquidConfig;
  public infoClient: InfoClient;
  public exchangeClient: ExchangeClient;
  public subscriptionClient: SubscriptionClient;

  constructor(config: HyperliquidConfig) {
    this.config = config;

    // Info client for querying data (no auth required)
    this.infoClient = new InfoClient({
      transport: new HttpTransport({
        url: config.testnet
          ? process.env.HYPERLIQUID_TESTNET_URL
          : process.env.HYPERLIQUID_MAINNET_URL,
      }),
    });

    // Exchange client for trading (requires auth)
    this.exchangeClient = new ExchangeClient({
      wallet: config.apiPrivateKey, // API wallet private key
      testnet: config.testnet,
      transport: new HttpTransport({
        url: config.testnet
          ? process.env.HYPERLIQUID_TESTNET_URL
          : process.env.HYPERLIQUID_MAINNET_URL,
      }),
    });

    // Subscription client for WebSocket feeds
    this.subscriptionClient = new SubscriptionClient({
      transport: new WebSocketTransport({
        url: config.testnet
          ? process.env.HYPERLIQUID_WS_TESTNET_URL
          : process.env.HYPERLIQUID_WS_MAINNET_URL,
      }),
    });
  }

  // Query user's open orders
  async getOpenOrders(userAddress: string) {
    return await this.infoClient.openOrders({ user: userAddress });
  }

  // Query user's positions
  async getUserPositions(userAddress: string) {
    return await this.infoClient.clearinghouseState({ user: userAddress });
  }

  // Query L2 orderbook
  async getOrderbook(symbol: string) {
    return await this.infoClient.l2Book({ coin: symbol });
  }

  // Query recent trades
  async getRecentTrades(symbol: string) {
    return await this.infoClient.candleSnapshot({
      coin: symbol,
      interval: '1m',
      startTime: Date.now() - 3600000, // Last hour
      endTime: Date.now(),
    });
  }

  // Place order
  async placeOrder(params: {
    coin: string;
    isBuy: boolean;
    price: number;
    size: number;
    orderType: 'limit' | 'market';
    reduceOnly?: boolean;
  }) {
    const orderRequest = {
      coin: params.coin,
      isBuy: params.isBuy,
      px: params.price,
      sz: params.size,
      orderType: params.orderType === 'limit'
        ? { limit: { tif: 'Gtc' as const } }
        : { market: {} },
      reduceOnly: params.reduceOnly || false,
    };

    return await this.exchangeClient.order(orderRequest);
  }

  // Cancel order
  async cancelOrder(orderId: string, coin: string) {
    return await this.exchangeClient.cancel({
      cancels: [{ oid: orderId, coin }],
    });
  }

  // Subscribe to orderbook updates
  async subscribeToOrderbook(symbol: string, callback: (data: any) => void) {
    return await this.subscriptionClient.l2Book(
      { coin: symbol },
      (event) => callback(event)
    );
  }

  // Subscribe to trades
  async subscribeToTrades(symbol: string, callback: (data: any) => void) {
    return await this.subscriptionClient.trades(
      { coin: symbol },
      (event) => callback(event)
    );
  }

  // Subscribe to user order updates
  async subscribeToUserOrders(userAddress: string, callback: (data: any) => void) {
    return await this.subscriptionClient.userEvents(
      { user: userAddress },
      (event) => callback(event)
    );
  }

  // Close connection
  async close() {
    // WebSocket cleanup handled by SDK
  }
}

// Singleton instance
let hyperliquidClientInstance: HyperliquidClient | null = null;

export function getHyperliquidClient(): HyperliquidClient {
  if (!hyperliquidClientInstance) {
    hyperliquidClientInstance = new HyperliquidClient({
      testnet: process.env.HYPERLIQUID_TESTNET === 'true',
      walletAddress: process.env.HYPERLIQUID_WALLET!,
      apiPrivateKey: process.env.HYPERLIQUID_API_PRIVATE_KEY!,
    });
  }
  return hyperliquidClientInstance;
}
```

---

## WebSocket Subscriptions

### Subscription Types

| Subscription | Description | Use Case |
|--------------|-------------|----------|
| **l2Book** | Orderbook (bid/ask levels) | Display orderbook depth |
| **trades** | Recent trades | Show trade history |
| **candle** | OHLCV candles | Price charts |
| **allMids** | Mid prices for all coins | Market overview |
| **userEvents** | User order fills, cancellations | Order status updates |
| **userFills** | User trade fills | P&L calculations |

### Implementation Example

Create `backend/services/hyperliquid/MarketDataService.ts`:

```typescript
import { getHyperliquidClient } from './HyperliquidClient';
import { EventEmitter } from 'events';

interface OrderbookUpdate {
  coin: string;
  levels: [[string, string][], [string, string][]]; // [bids, asks]
  time: number;
}

export class MarketDataService extends EventEmitter {
  private subscriptions: Map<string, any> = new Map();
  private client = getHyperliquidClient();

  async subscribeToOrderbook(symbol: string) {
    if (this.subscriptions.has(`orderbook:${symbol}`)) {
      return; // Already subscribed
    }

    const subscription = await this.client.subscribeToOrderbook(
      symbol,
      (data: OrderbookUpdate) => {
        this.emit('orderbook', { symbol, data });
      }
    );

    this.subscriptions.set(`orderbook:${symbol}`, subscription);
    console.log(`Subscribed to orderbook for ${symbol}`);
  }

  async subscribeToTrades(symbol: string) {
    if (this.subscriptions.has(`trades:${symbol}`)) {
      return;
    }

    const subscription = await this.client.subscribeToTrades(
      symbol,
      (data: any) => {
        this.emit('trades', { symbol, data });
      }
    );

    this.subscriptions.set(`trades:${symbol}`, subscription);
    console.log(`Subscribed to trades for ${symbol}`);
  }

  async subscribeToUserEvents(userAddress: string) {
    const key = `userEvents:${userAddress}`;
    if (this.subscriptions.has(key)) {
      return;
    }

    const subscription = await this.client.subscribeToUserOrders(
      userAddress,
      (event: any) => {
        this.emit('userEvent', { userAddress, event });
      }
    );

    this.subscriptions.set(key, subscription);
    console.log(`Subscribed to user events for ${userAddress}`);
  }

  async unsubscribeAll() {
    for (const [key, subscription] of this.subscriptions) {
      await subscription.unsubscribe();
      console.log(`Unsubscribed from ${key}`);
    }
    this.subscriptions.clear();
  }
}

// Singleton
let marketDataServiceInstance: MarketDataService | null = null;

export function getMarketDataService(): MarketDataService {
  if (!marketDataServiceInstance) {
    marketDataServiceInstance = new MarketDataService();
  }
  return marketDataServiceInstance;
}
```

### Frontend Integration

Use Socket.io to relay WebSocket data to frontend:

```typescript
// backend/sockets/hyperliquid.ts
import { Server } from 'socket.io';
import { getMarketDataService } from '../services/hyperliquid/MarketDataService';

export function setupHyperliquidSocket(io: Server) {
  const marketDataService = getMarketDataService();

  io.on('connection', (socket) => {
    console.log('Client connected to Hyperliquid feed');

    // Client subscribes to orderbook
    socket.on('subscribe:orderbook', async (symbol: string) => {
      await marketDataService.subscribeToOrderbook(symbol);
      socket.join(`orderbook:${symbol}`);
    });

    // Client subscribes to trades
    socket.on('subscribe:trades', async (symbol: string) => {
      await marketDataService.subscribeToTrades(symbol);
      socket.join(`trades:${symbol}`);
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected from Hyperliquid feed');
    });
  });

  // Broadcast orderbook updates
  marketDataService.on('orderbook', ({ symbol, data }) => {
    io.to(`orderbook:${symbol}`).emit('orderbook:update', { symbol, data });
  });

  // Broadcast trades
  marketDataService.on('trades', ({ symbol, data }) => {
    io.to(`trades:${symbol}`).emit('trades:update', { symbol, data });
  });
}
```

---

## Order Management Flow

### Order Placement Sequence

```
1. User submits order form → Frontend validation
2. Frontend sends POST /api/hyperliquid/orders → Backend
3. Backend validates order (balance, size, symbol)
4. Backend saves order to PostgreSQL (status: 'pending')
5. Backend calls HyperliquidClient.placeOrder()
6. Hyperliquid API returns order ID
7. Backend updates order (status: 'open', hyperliquidOrderId)
8. Backend subscribes to user events for this order
9. Hyperliquid sends fill events via WebSocket
10. Backend updates order (status: 'filled')
11. Frontend receives update via Socket.io
12. UI shows order as filled
```

### OrderExecutionService Implementation

Create `backend/services/hyperliquid/OrderExecutionService.ts`:

```typescript
import { db } from '../../db';
import { hyperliquidOrders } from '../../db/schema/hyperliquid';
import { getHyperliquidClient } from './HyperliquidClient';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

interface PlaceOrderParams {
  userId: string;
  userWalletAddress: string;
  symbol: string;
  side: 'buy' | 'sell';
  orderType: 'limit' | 'market';
  price?: number;
  size: number;
  timeInForce?: 'Gtc' | 'Ioc' | 'Alo';
  reduceOnly?: boolean;
}

export class OrderExecutionService {
  private client = getHyperliquidClient();

  async placeOrder(params: PlaceOrderParams) {
    const internalOrderId = uuidv4();

    try {
      // 1. Validate order
      await this.validateOrder(params);

      // 2. Save to database (pending status)
      const [dbOrder] = await db.insert(hyperliquidOrders).values({
        userId: params.userId,
        internalOrderId,
        symbol: params.symbol,
        side: params.side,
        orderType: params.orderType,
        price: params.price?.toString(),
        size: params.size.toString(),
        status: 'pending',
        timeInForce: params.timeInForce || 'Gtc',
        reduceOnly: params.reduceOnly || false,
      }).returning();

      // 3. Submit to Hyperliquid
      const hyperliquidResponse = await this.client.placeOrder({
        coin: params.symbol,
        isBuy: params.side === 'buy',
        price: params.price || 0, // Market orders use 0
        size: params.size,
        orderType: params.orderType,
        reduceOnly: params.reduceOnly,
      });

      // 4. Update with Hyperliquid order ID
      if (hyperliquidResponse.status === 'ok') {
        await db.update(hyperliquidOrders)
          .set({
            hyperliquidOrderId: hyperliquidResponse.response.data.statuses[0].oid,
            status: 'open',
            updatedAt: new Date(),
          })
          .where(eq(hyperliquidOrders.id, dbOrder.id));

        return {
          success: true,
          orderId: dbOrder.id,
          hyperliquidOrderId: hyperliquidResponse.response.data.statuses[0].oid,
        };
      } else {
        // Order rejected
        await db.update(hyperliquidOrders)
          .set({
            status: 'failed',
            errorMessage: JSON.stringify(hyperliquidResponse),
            updatedAt: new Date(),
          })
          .where(eq(hyperliquidOrders.id, dbOrder.id));

        throw new Error(`Order rejected: ${JSON.stringify(hyperliquidResponse)}`);
      }
    } catch (error: any) {
      console.error('Order placement failed:', error);

      // Update order as failed
      await db.update(hyperliquidOrders)
        .set({
          status: 'failed',
          errorMessage: error.message,
          updatedAt: new Date(),
        })
        .where(eq(hyperliquidOrders.internalOrderId, internalOrderId));

      throw error;
    }
  }

  async cancelOrder(orderId: string) {
    // Get order from DB
    const [order] = await db.select()
      .from(hyperliquidOrders)
      .where(eq(hyperliquidOrders.id, orderId))
      .limit(1);

    if (!order) {
      throw new Error('Order not found');
    }

    if (order.status !== 'open') {
      throw new Error('Order cannot be cancelled (not open)');
    }

    // Cancel on Hyperliquid
    const response = await this.client.cancelOrder(
      order.hyperliquidOrderId!,
      order.symbol
    );

    // Update DB
    await db.update(hyperliquidOrders)
      .set({
        status: 'cancelled',
        updatedAt: new Date(),
      })
      .where(eq(hyperliquidOrders.id, orderId));

    return { success: true };
  }

  private async validateOrder(params: PlaceOrderParams) {
    // Check balance
    const positions = await this.client.getUserPositions(params.userWalletAddress);
    const availableBalance = parseFloat(positions.marginSummary.accountValue);

    const orderValue = (params.price || 0) * params.size;

    if (orderValue > availableBalance) {
      throw new Error('Insufficient balance');
    }

    // Check symbol exists
    // TODO: Validate symbol against supported symbols

    // Check size limits
    if (params.size <= 0) {
      throw new Error('Order size must be positive');
    }

    return true;
  }
}
```

---

## Testing Strategy

### Unit Tests

Test individual components in isolation:

```typescript
// tests/unit/HyperliquidClient.test.ts
import { describe, it, expect, vi } from 'vitest';
import { HyperliquidClient } from '../backend/services/hyperliquid/HyperliquidClient';

describe('HyperliquidClient', () => {
  it('should initialize clients', () => {
    const client = new HyperliquidClient({
      testnet: true,
      walletAddress: '0x123',
      apiPrivateKey: '0xabc',
    });

    expect(client.infoClient).toBeDefined();
    expect(client.exchangeClient).toBeDefined();
    expect(client.subscriptionClient).toBeDefined();
  });

  it('should query orderbook', async () => {
    const client = new HyperliquidClient({ /* ... */ });
    const orderbook = await client.getOrderbook('BTC');

    expect(orderbook).toHaveProperty('levels');
  });
});
```

### Integration Tests

Test full order flow:

```typescript
// tests/integration/orderFlow.test.ts
import { describe, it, expect } from 'vitest';
import { OrderExecutionService } from '../backend/services/hyperliquid/OrderExecutionService';

describe('Order Flow Integration', () => {
  it('should place and fill a limit order', async () => {
    const service = new OrderExecutionService();

    const result = await service.placeOrder({
      userId: 'test-user',
      userWalletAddress: '0x123',
      symbol: 'BTC',
      side: 'buy',
      orderType: 'limit',
      price: 50000,
      size: 0.001,
    });

    expect(result.success).toBe(true);
    expect(result.orderId).toBeDefined();
  });
});
```

### E2E Tests (Playwright)

Test frontend integration:

```typescript
// tests/e2e/trading.spec.ts
import { test, expect } from '@playwright/test';

test('user can place a limit order', async ({ page }) => {
  await page.goto('/trading/BTC-USD');

  // Fill order form
  await page.fill('[data-testid="order-size"]', '0.001');
  await page.fill('[data-testid="order-price"]', '50000');
  await page.click('[data-testid="place-order-btn"]');

  // Wait for success notification
  await expect(page.locator('.toast-success')).toContainText('Order placed');

  // Verify order appears in open orders
  await expect(page.locator('[data-testid="open-orders"]')).toContainText('BTC');
});
```

---

## Security Considerations

### 1. API Key Management

**✅ DO:**
- Store API private key in environment variables or secure vaults (AWS Secrets Manager, HashiCorp Vault)
- Use API wallet (not main wallet) for trading
- Rotate API keys quarterly
- Implement IP whitelisting if supported

**❌ DON'T:**
- Hardcode private keys in source code
- Commit `.env` files to git
- Share API keys across environments
- Use main wallet private key for API trading

### 2. Request Signing

Hyperliquid requires signed requests for trading operations. The SDK handles this automatically:

```typescript
// ✅ SDK handles signing
await exchangeClient.order({
  coin: 'BTC',
  isBuy: true,
  px: 50000,
  sz: 0.001,
  orderType: { limit: { tif: 'Gtc' } },
});

// ❌ Never manually sign unless absolutely necessary
```

### 3. Rate Limiting

Implement client-side rate limiting to avoid hitting API limits:

```typescript
import Bottleneck from 'bottleneck';

const limiter = new Bottleneck({
  maxConcurrent: 5, // Max 5 concurrent requests
  minTime: 100,     // Min 100ms between requests
});

async function placeOrderWithRateLimit(params: any) {
  return await limiter.schedule(() => client.placeOrder(params));
}
```

### 4. Input Validation

Always validate and sanitize user inputs:

```typescript
import { z } from 'zod';

const placeOrderSchema = z.object({
  symbol: z.string().min(1).max(20),
  side: z.enum(['buy', 'sell']),
  orderType: z.enum(['limit', 'market']),
  price: z.number().positive().optional(),
  size: z.number().positive(),
});

// Validate before processing
const validatedData = placeOrderSchema.parse(req.body);
```

### 5. Audit Logging

Log all trading operations for audit trail:

```typescript
async function auditLog(event: string, data: any) {
  await db.insert(auditLogs).values({
    event,
    userId: data.userId,
    metadata: JSON.stringify(data),
    ipAddress: data.ipAddress,
    timestamp: new Date(),
  });
}

// Log order placement
await auditLog('order.placed', {
  userId: user.id,
  orderId: result.orderId,
  symbol: params.symbol,
  side: params.side,
  size: params.size,
});
```

---

## Fallback & Error Handling

### Circuit Breaker Pattern

Prevent cascading failures:

```typescript
class HyperliquidCircuitBreaker {
  private failureCount = 0;
  private lastFailureTime = 0;
  private readonly threshold = 5;
  private readonly timeout = 60000; // 1 minute
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN - Hyperliquid unavailable');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }

  private onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.threshold) {
      this.state = 'OPEN';
      console.error('Circuit breaker opened - too many failures');
    }
  }

  isOpen(): boolean {
    return this.state === 'OPEN';
  }
}
```

### Retry Logic

Retry transient errors with exponential backoff:

```typescript
async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      if (attempt === maxRetries - 1) {
        throw error;
      }

      // Check if error is retryable
      if (!isRetryableError(error)) {
        throw error;
      }

      const delay = baseDelay * Math.pow(2, attempt);
      console.log(`Retry attempt ${attempt + 1} after ${delay}ms`);
      await sleep(delay);
    }
  }

  throw new Error('Max retries exceeded');
}

function isRetryableError(error: any): boolean {
  // Retry on network errors or 5xx status codes
  return (
    error.code === 'ECONNRESET' ||
    error.code === 'ETIMEDOUT' ||
    error.response?.status >= 500
  );
}
```

### Fallback to 0x Protocol

Route market orders to 0x if Hyperliquid is unavailable:

```typescript
class OrderRouter {
  private hyperliquidBreaker = new HyperliquidCircuitBreaker();

  async placeOrder(order: PlaceOrderParams) {
    try {
      // Try Hyperliquid first
      return await this.hyperliquidBreaker.execute(() =>
        hyperliquidService.placeOrder(order)
      );
    } catch (error) {
      if (this.hyperliquidBreaker.isOpen() && order.orderType === 'market') {
        console.warn('Hyperliquid unavailable, routing to 0x Protocol');
        return await this.routeTo0x(order);
      }
      throw error;
    }
  }

  private async routeTo0x(order: PlaceOrderParams) {
    // Convert order to 0x swap
    // Implementation in 0x integration service
  }
}
```

---

## Monitoring & Observability

### Metrics to Track

| Metric | Description | Alert Threshold |
|--------|-------------|-----------------|
| **Order Success Rate** | % of orders successfully placed | < 95% |
| **Order Latency** | Time from submission to confirmation | > 5 seconds |
| **WebSocket Uptime** | % time WebSocket is connected | < 99% |
| **Circuit Breaker Opens** | Number of times circuit breaker opens | > 0 |
| **Reconciliation Discrepancies** | Orders with status mismatch | > 0 |
| **API Error Rate** | % of API calls that fail | > 5% |

### Logging

Use structured logging:

```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

// Log order placement
logger.info('Order placed', {
  service: 'hyperliquid',
  action: 'order.placed',
  orderId: result.orderId,
  symbol: params.symbol,
  side: params.side,
  size: params.size,
  userId: params.userId,
  timestamp: new Date().toISOString(),
});
```

### Alerting

Set up alerts for critical issues:

```typescript
async function sendAlert(severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL', message: string) {
  // Send to Slack
  await fetch(process.env.SLACK_WEBHOOK_URL!, {
    method: 'POST',
    body: JSON.stringify({
      text: `[${severity}] Hyperliquid: ${message}`,
    }),
  });

  // Send to PagerDuty for CRITICAL
  if (severity === 'CRITICAL') {
    // PagerDuty integration
  }
}

// Example: Alert when circuit breaker opens
if (circuitBreaker.isOpen()) {
  await sendAlert('HIGH', 'Circuit breaker opened - Hyperliquid API unavailable');
}
```

---

## Next Steps

### Immediate Actions

1. **Review this roadmap** with the team
2. **Set up Hyperliquid testnet account** and API wallet
3. **Install `@nktkas/hyperliquid` package**
4. **Create database schema** for orders and positions
5. **Implement basic `HyperliquidClient`**

### Questions to Answer

- [ ] Which trading pairs do we want to support initially?
- [ ] What is our target order latency SLA?
- [ ] Do we need to support advanced order types (stop-loss, take-profit)?
- [ ] Should we implement copy trading features?
- [ ] What is our fallback strategy if Hyperliquid is down for extended periods?

### Resources

- **Hyperliquid Docs**: https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api
- **TypeScript SDK**: https://github.com/nktkas/hyperliquid
- **Official Python SDK**: https://github.com/hyperliquid-dex/hyperliquid-python-sdk
- **Community Discord**: https://discord.gg/hyperliquid

---

**Document Owner:** Development Team
**Last Updated:** 2025-11-18
**Version:** 1.0
