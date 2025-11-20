# Hyperliquid Integration Service

This module provides a complete integration with Hyperliquid's perpetual futures DEX.

## Features

- ✅ **API Client**: Full wrapper around Hyperliquid's Info, Exchange, and WebSocket APIs
- ✅ **Order Management**: Place, cancel, and track orders
- ✅ **Position Tracking**: Monitor perpetual futures positions and P&L
- ✅ **Real-time Data**: WebSocket subscriptions for orderbook, trades, and user events
- ✅ **Database Schema**: Complete Drizzle ORM schema for persistence
- ✅ **Type Safety**: Full TypeScript support with Zod validation

## Quick Start

### 1. Environment Variables

Add to your `.env` file:

```bash
HYPERLIQUID_TESTNET=true
HYPERLIQUID_LIVE_API_WALLE=0x...                                  # Main wallet address
HYPERLIQUID_API_PRIVATE_KEY=0x...                        # API wallet private key
HYPERLIQUID_MAINNET_URL=https://api.hyperliquid.xyz
HYPERLIQUID_TESTNET_URL=https://api.hyperliquid-testnet.xyz
HYPERLIQUID_WS_MAINNET_URL=wss://api.hyperliquid.xyz/ws
HYPERLIQUID_WS_TESTNET_URL=wss://api.hyperliquid-testnet.xyz/ws
```

### 2. Initialize Client

```typescript
import { getHyperliquidClient } from './services/hyperliquid';

const client = getHyperliquidClient();
```

### 3. Query Market Data

```typescript
// Get orderbook
const orderbook = await client.getOrderbook('BTC');
console.log('Best bid:', orderbook.levels[0][0]);
console.log('Best ask:', orderbook.levels[1][0]);

// Get all available symbols
const metas = await client.getAllMetas();
console.log('Available symbols:', metas.universe);

// Get mid prices
const mids = await client.getAllMids();
console.log('BTC mid price:', mids.BTC);
```

### 4. Place Orders

```typescript
// Place a limit order
const result = await client.placeOrder({
  coin: 'BTC',
  isBuy: true,
  price: 50000,
  size: 0.01,
  orderType: 'limit',
  timeInForce: 'Gtc',
});

console.log('Order placed:', result);

// Place a market order
const marketOrder = await client.placeOrder({
  coin: 'ETH',
  isBuy: false,
  price: 0, // Market orders use 0
  size: 0.1,
  orderType: 'market',
});
```

### 5. Query User Data

```typescript
const userAddress = '0x...';

// Get open orders
const openOrders = await client.getOpenOrders(userAddress);
console.log('Open orders:', openOrders);

// Get user state (positions, margin, etc.)
const userState = await client.getUserState(userAddress);
console.log('Account value:', userState.marginSummary.accountValue);
console.log('Positions:', userState.assetPositions);
```

### 6. WebSocket Subscriptions

```typescript
// Subscribe to orderbook updates
const orderbookSub = await client.subscribeToOrderbook('BTC', (data) => {
  console.log('Orderbook update:', data);
});

// Subscribe to trades
const tradesSub = await client.subscribeToTrades('BTC', (data) => {
  console.log('New trade:', data);
});

// Subscribe to user events (order fills, cancellations)
const userEventsSub = await client.subscribeToUserEvents(userAddress, (event) => {
  if (event.fills) {
    console.log('Order filled:', event.fills);
  }
});

// Unsubscribe when done
await orderbookSub.unsubscribe();
await tradesSub.unsubscribe();
await userEventsSub.unsubscribe();
```

## Database Schema

The integration includes 5 main tables:

### 1. `hyperliquid_orders`
Stores all orders placed through Hyperliquid:
- Order details (symbol, side, price, size)
- Status tracking (pending, open, filled, cancelled)
- Fill information (filled size, average price)
- Timestamps and metadata

### 2. `hyperliquid_positions`
Tracks perpetual futures positions:
- Position details (symbol, side, size)
- Entry price and mark price
- P&L (unrealized and realized)
- Leverage and margin used

### 3. `hyperliquid_fills`
Individual order executions:
- Fill price and size
- Trading fees
- Maker/taker flag
- Transaction hash

### 4. `hyperliquid_reconciliations`
Audit trail for reconciliation:
- DB vs API status comparison
- Discrepancy tracking
- Resolution notes

### 5. `hyperliquid_user_state_cache`
Cached user clearinghouse state:
- Account value
- Total margin used
- P&L summary
- Cache expiration

## Usage in Services

### OrderExecutionService

```typescript
import { getHyperliquidClient } from './services/hyperliquid';
import { db } from './db';
import { hyperliquidOrders } from './db/schema/hyperliquid';

class OrderExecutionService {
  private client = getHyperliquidClient();

  async placeOrder(params: {
    userId: string;
    userAddress: string;
    symbol: string;
    side: 'buy' | 'sell';
    price: number;
    size: number;
  }) {
    // 1. Save to DB
    const [order] = await db.insert(hyperliquidOrders).values({
      userId: params.userId,
      symbol: params.symbol,
      side: params.side,
      price: params.price.toString(),
      size: params.size.toString(),
      status: 'pending',
      orderType: 'limit',
    }).returning();

    try {
      // 2. Submit to Hyperliquid
      const result = await this.client.placeOrder({
        coin: params.symbol,
        isBuy: params.side === 'buy',
        price: params.price,
        size: params.size,
        orderType: 'limit',
      });

      // 3. Update with Hyperliquid order ID
      await db.update(hyperliquidOrders)
        .set({
          hyperliquidOrderId: result.response.data.statuses[0].oid,
          status: 'open',
        })
        .where(eq(hyperliquidOrders.id, order.id));

      return { success: true, order };
    } catch (error) {
      // 4. Mark as failed
      await db.update(hyperliquidOrders)
        .set({ status: 'failed', errorMessage: error.message })
        .where(eq(hyperliquidOrders.id, order.id));

      throw error;
    }
  }
}
```

## Constants

```typescript
import { HYPERLIQUID_CONSTANTS } from './services/hyperliquid';

// Order status
HYPERLIQUID_CONSTANTS.ORDER_STATUS.OPEN; // 'open'
HYPERLIQUID_CONSTANTS.ORDER_STATUS.FILLED; // 'filled'

// Time in force
HYPERLIQUID_CONSTANTS.TIME_IN_FORCE.GTC; // 'Gtc'
HYPERLIQUID_CONSTANTS.TIME_IN_FORCE.IOC; // 'Ioc'

// Candle intervals
HYPERLIQUID_CONSTANTS.CANDLE_INTERVALS; // ['1m', '5m', '1h', ...]
```

## Error Handling

All client methods throw errors that should be caught:

```typescript
try {
  const result = await client.placeOrder({
    coin: 'BTC',
    isBuy: true,
    price: 50000,
    size: 0.01,
    orderType: 'limit',
  });
} catch (error) {
  if (error.message.includes('insufficient margin')) {
    // Handle insufficient margin
  } else if (error.message.includes('rate limit')) {
    // Handle rate limiting
  } else {
    // Handle other errors
  }
}
```

## Testing

Run the test suite:

```bash
pnpm test
```

Test specific functionality:

```bash
# Test API connectivity
pnpm test hyperliquid.test.ts

# Test order placement
pnpm test orderExecution.test.ts
```

## Monitoring

Key metrics to monitor:
- Order success rate
- Order placement latency
- WebSocket connection uptime
- Reconciliation discrepancies
- API error rate

## Security

- **API Wallet**: Use a separate API wallet (not your main wallet) for trading
- **Private Keys**: Never commit private keys to version control
- **Environment Variables**: Store sensitive data in environment variables
- **Rate Limiting**: Implement client-side rate limiting to avoid hitting API limits

## Resources

- [Hyperliquid Docs](https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api)
- [TypeScript SDK](https://github.com/nktkas/hyperliquid)
- [Integration Roadmap](../../../docs/Project_Structure/HYPERLIQUID_INTEGRATION_ROADMAP.md)
