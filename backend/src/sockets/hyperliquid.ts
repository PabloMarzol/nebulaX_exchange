import { Server as SocketIOServer, Socket } from 'socket.io';
import { getMarketDataService } from '../services/hyperliquid/MarketDataService';
import { getMarketDataCache } from '../services/hyperliquid/MarketDataCache';
import { getOrderStatusService } from '../services/hyperliquid/OrderStatusService';
import { getPositionManagementService } from '../services/hyperliquid/PositionManagementService';

/**
 * Setup Hyperliquid WebSocket handlers for Socket.io
 *
 * This module bridges Hyperliquid's WebSocket API with Socket.io,
 * allowing frontend clients to subscribe to real-time market data, order updates, and position tracking.
 *
 * Events emitted to clients:
 * - orderbook:update - Orderbook changes
 * - trades:update - New trades
 * - candles:update - Candle updates
 * - mids:update - Mid price updates
 * - userEvents:update - User-specific events
 * - order:fill - Order fill notifications
 * - order:statusChange - Order status change notifications
 * - position:update - Position update notifications
 * - position:closed - Position closed notifications
 *
 * Events received from clients:
 * - subscribe:orderbook - Subscribe to orderbook
 * - subscribe:trades - Subscribe to trades
 * - subscribe:candles - Subscribe to candles
 * - subscribe:mids - Subscribe to all mids
 * - subscribe:userEvents - Subscribe to user events
 * - subscribe:orders - Subscribe to order updates (requires userId and userAddress)
 * - subscribe:positions - Subscribe to position updates (requires userId and userAddress)
 * - unsubscribe:orderbook - Unsubscribe from orderbook
 * - unsubscribe:trades - Unsubscribe from trades
 * - unsubscribe:candles - Unsubscribe from candles
 * - unsubscribe:mids - Unsubscribe from all mids
 * - unsubscribe:userEvents - Unsubscribe from user events
 * - unsubscribe:orders - Unsubscribe from order updates
 * - unsubscribe:positions - Unsubscribe from position updates
 * - getStats - Get service statistics
 */

export function setupHyperliquidSocket(io: SocketIOServer) {
  const marketDataService = getMarketDataService();
  const cache = getMarketDataCache();
  const orderStatusService = getOrderStatusService();
  const positionService = getPositionManagementService();

  // Track room memberships for cleanup
  const roomMemberships = new Map<string, Set<string>>();

  /**
   * Add socket to a room and track membership
   */
  function joinRoom(socket: Socket, room: string) {
    socket.join(room);

    if (!roomMemberships.has(socket.id)) {
      roomMemberships.set(socket.id, new Set());
    }
    roomMemberships.get(socket.id)!.add(room);
  }

  /**
   * Remove socket from a room
   */
  function leaveRoom(socket: Socket, room: string) {
    socket.leave(room);

    const rooms = roomMemberships.get(socket.id);
    if (rooms) {
      rooms.delete(room);
    }
  }

  // Forward orderbook updates from MarketDataService to Socket.io clients
  marketDataService.on('orderbook', ({ symbol, data }) => {
    // Update cache
    cache.setOrderbook(symbol, data);

    // Emit to all clients subscribed to this orderbook
    io.to(`orderbook:${symbol}`).emit('orderbook:update', {
      symbol,
      data: {
        bids: data.levels[0].map(([price, size]) => ({ price, size })),
        asks: data.levels[1].map(([price, size]) => ({ price, size })),
        timestamp: data.time,
      },
    });
  });

  // Forward trades updates
  marketDataService.on('trades', ({ symbol, data }) => {
    // Update cache
    cache.setTrades(symbol, data);

    // Emit to all clients subscribed to trades
    io.to(`trades:${symbol}`).emit('trades:update', {
      symbol,
      data: data.map((trade) => ({
        side: trade.side,
        price: trade.px,
        size: trade.sz,
        timestamp: trade.time,
      })),
    });
  });

  // Forward candle updates
  marketDataService.on('candles', ({ symbol, interval, data }) => {
    // Update cache
    cache.setCandles(symbol, interval, [data]);

    // Emit to all clients subscribed to candles
    io.to(`candles:${symbol}:${interval}`).emit('candles:update', {
      symbol,
      interval,
      data,
    });
  });

  // Forward all mids updates
  marketDataService.on('allMids', ({ data }) => {
    // Update cache
    cache.setAllMids(data);

    // Emit to all clients subscribed to mids
    io.to('allMids').emit('mids:update', { data });
  });

  // Forward user events
  marketDataService.on('userEvents', ({ userAddress, data }) => {
    // Emit to all clients subscribed to this user's events
    io.to(`userEvents:${userAddress}`).emit('userEvents:update', {
      userAddress,
      data,
    });
  });

  // Forward order fill events
  orderStatusService.on('orderFill', (fillEvent) => {
    // Emit to all clients subscribed to this user's orders
    io.to(`orders:${fillEvent.userId}`).emit('order:fill', fillEvent);
    console.log(`[HyperliquidSocket] Order fill event emitted for user ${fillEvent.userId}`);
  });

  // Forward order status change events
  orderStatusService.on('orderStatusChange', (statusEvent) => {
    // Emit to all clients subscribed to this user's orders
    io.to(`orders:${statusEvent.userId}`).emit('order:statusChange', statusEvent);
    console.log(
      `[HyperliquidSocket] Order status change emitted: ${statusEvent.orderId} (${statusEvent.previousStatus} -> ${statusEvent.newStatus})`
    );
  });

  // Forward position update events
  positionService.on('positionUpdate', (positionEvent) => {
    // Emit to all clients subscribed to this user's positions
    io.to(`positions:${positionEvent.userId}`).emit('position:update', positionEvent);
    console.log(
      `[HyperliquidSocket] Position update emitted: ${positionEvent.symbol} (${positionEvent.side}) PnL: ${positionEvent.unrealizedPnl}`
    );
  });

  // Forward position closed events
  positionService.on('positionClosed', (closedEvent) => {
    // Emit to all clients subscribed to this user's positions
    io.to(`positions:${closedEvent.userId}`).emit('position:closed', closedEvent);
    console.log(
      `[HyperliquidSocket] Position closed emitted: ${closedEvent.symbol} (${closedEvent.side}) Realized PnL: ${closedEvent.realizedPnl}`
    );
  });

  // Handle new client connections
  io.on('connection', (socket: Socket) => {
    console.log(`[HyperliquidSocket] Client connected: ${socket.id}`);

    /**
     * Subscribe to orderbook updates
     */
    socket.on('subscribe:orderbook', async (symbol: string) => {
      if (!symbol || typeof symbol !== 'string') {
        socket.emit('error', { message: 'Invalid symbol' });
        return;
      }

      try {
        console.log(`[HyperliquidSocket] ${socket.id} subscribing to orderbook: ${symbol}`);

        // Join Socket.io room
        joinRoom(socket, `orderbook:${symbol}`);

        // Subscribe to Hyperliquid WebSocket (if not already subscribed)
        await marketDataService.subscribeToOrderbook(symbol);

        // Send cached data immediately if available
        const cachedOrderbook = cache.getOrderbook(symbol);
        if (cachedOrderbook) {
          socket.emit('orderbook:update', {
            symbol,
            data: {
              bids: cachedOrderbook.bids,
              asks: cachedOrderbook.asks,
              timestamp: cachedOrderbook.timestamp,
            },
          });
        }

        socket.emit('subscribed', { type: 'orderbook', symbol });
      } catch (error: any) {
        console.error(`[HyperliquidSocket] Error subscribing to orderbook ${symbol}:`, error);
        socket.emit('error', { message: `Failed to subscribe to orderbook: ${error.message}` });
      }
    });

    /**
     * Subscribe to trades
     */
    socket.on('subscribe:trades', async (symbol: string) => {
      if (!symbol || typeof symbol !== 'string') {
        socket.emit('error', { message: 'Invalid symbol' });
        return;
      }

      try {
        console.log(`[HyperliquidSocket] ${socket.id} subscribing to trades: ${symbol}`);

        joinRoom(socket, `trades:${symbol}`);
        await marketDataService.subscribeToTrades(symbol);

        // Send cached trades
        const cachedTrades = cache.getTrades(symbol, 50);
        if (cachedTrades) {
          socket.emit('trades:update', { symbol, data: cachedTrades });
        }

        socket.emit('subscribed', { type: 'trades', symbol });
      } catch (error: any) {
        console.error(`[HyperliquidSocket] Error subscribing to trades ${symbol}:`, error);
        socket.emit('error', { message: `Failed to subscribe to trades: ${error.message}` });
      }
    });

    /**
     * Subscribe to candles
     */
    socket.on('subscribe:candles', async ({ symbol, interval }: { symbol: string; interval: string }) => {
      if (!symbol || !interval) {
        socket.emit('error', { message: 'Invalid symbol or interval' });
        return;
      }

      try {
        console.log(`[HyperliquidSocket] ${socket.id} subscribing to candles: ${symbol} ${interval}`);

        joinRoom(socket, `candles:${symbol}:${interval}`);
        await marketDataService.subscribeToCandles(symbol, interval);

        // Send cached candles
        const cachedCandles = cache.getCandles(symbol, interval, 100);
        if (cachedCandles) {
          socket.emit('candles:update', { symbol, interval, data: cachedCandles });
        }

        socket.emit('subscribed', { type: 'candles', symbol, interval });
      } catch (error: any) {
        console.error(`[HyperliquidSocket] Error subscribing to candles ${symbol} ${interval}:`, error);
        socket.emit('error', { message: `Failed to subscribe to candles: ${error.message}` });
      }
    });

    /**
     * Subscribe to all mids
     */
    socket.on('subscribe:mids', async () => {
      try {
        console.log(`[HyperliquidSocket] ${socket.id} subscribing to all mids`);

        joinRoom(socket, 'allMids');
        await marketDataService.subscribeToAllMids();

        // Send cached mids
        const cachedMids = cache.getAllMids();
        if (cachedMids) {
          socket.emit('mids:update', { data: cachedMids });
        }

        socket.emit('subscribed', { type: 'mids' });
      } catch (error: any) {
        console.error('[HyperliquidSocket] Error subscribing to mids:', error);
        socket.emit('error', { message: `Failed to subscribe to mids: ${error.message}` });
      }
    });

    /**
     * Subscribe to user events
     */
    socket.on('subscribe:userEvents', async (userAddress: string) => {
      if (!userAddress || typeof userAddress !== 'string') {
        socket.emit('error', { message: 'Invalid user address' });
        return;
      }

      try {
        console.log(`[HyperliquidSocket] ${socket.id} subscribing to userEvents: ${userAddress}`);

        joinRoom(socket, `userEvents:${userAddress}`);
        await marketDataService.subscribeToUserEvents(userAddress);

        socket.emit('subscribed', { type: 'userEvents', userAddress });
      } catch (error: any) {
        console.error(`[HyperliquidSocket] Error subscribing to userEvents ${userAddress}:`, error);
        socket.emit('error', { message: `Failed to subscribe to user events: ${error.message}` });
      }
    });

    /**
     * Subscribe to order updates
     */
    socket.on('subscribe:orders', async ({ userId, userAddress }: { userId: string; userAddress: string }) => {
      if (!userId || !userAddress) {
        socket.emit('error', { message: 'Invalid userId or userAddress' });
        return;
      }

      try {
        console.log(`[HyperliquidSocket] ${socket.id} subscribing to orders: userId=${userId}`);

        joinRoom(socket, `orders:${userId}`);
        await orderStatusService.subscribeToUserOrders(userId, userAddress);

        socket.emit('subscribed', { type: 'orders', userId });
      } catch (error: any) {
        console.error(`[HyperliquidSocket] Error subscribing to orders for user ${userId}:`, error);
        socket.emit('error', { message: `Failed to subscribe to order updates: ${error.message}` });
      }
    });

    /**
     * Subscribe to position updates
     */
    socket.on('subscribe:positions', async ({ userId, userAddress, intervalMs }: { userId: string; userAddress: string; intervalMs?: number }) => {
      if (!userId || !userAddress) {
        socket.emit('error', { message: 'Invalid userId or userAddress' });
        return;
      }

      try {
        console.log(`[HyperliquidSocket] ${socket.id} subscribing to positions: userId=${userId}`);

        joinRoom(socket, `positions:${userId}`);

        // Start position polling for this user
        await positionService.startPositionPolling(userId, userAddress, intervalMs || 5000);

        // Send current positions immediately
        const positions = await positionService.getUserPositionsFromDb(userId);
        socket.emit('positions:snapshot', { positions });

        socket.emit('subscribed', { type: 'positions', userId });
      } catch (error: any) {
        console.error(`[HyperliquidSocket] Error subscribing to positions for user ${userId}:`, error);
        socket.emit('error', { message: `Failed to subscribe to position updates: ${error.message}` });
      }
    });

    /**
     * Unsubscribe from orderbook
     */
    socket.on('unsubscribe:orderbook', async (symbol: string) => {
      try {
        console.log(`[HyperliquidSocket] ${socket.id} unsubscribing from orderbook: ${symbol}`);

        leaveRoom(socket, `orderbook:${symbol}`);
        await marketDataService.unsubscribeFromOrderbook(symbol);

        socket.emit('unsubscribed', { type: 'orderbook', symbol });
      } catch (error: any) {
        console.error(`[HyperliquidSocket] Error unsubscribing from orderbook ${symbol}:`, error);
      }
    });

    /**
     * Unsubscribe from trades
     */
    socket.on('unsubscribe:trades', async (symbol: string) => {
      try {
        console.log(`[HyperliquidSocket] ${socket.id} unsubscribing from trades: ${symbol}`);

        leaveRoom(socket, `trades:${symbol}`);
        await marketDataService.unsubscribeFromTrades(symbol);

        socket.emit('unsubscribed', { type: 'trades', symbol });
      } catch (error: any) {
        console.error(`[HyperliquidSocket] Error unsubscribing from trades ${symbol}:`, error);
      }
    });

    /**
     * Unsubscribe from candles
     */
    socket.on('unsubscribe:candles', async ({ symbol, interval }: { symbol: string; interval: string }) => {
      try {
        console.log(`[HyperliquidSocket] ${socket.id} unsubscribing from candles: ${symbol} ${interval}`);

        leaveRoom(socket, `candles:${symbol}:${interval}`);
        await marketDataService.unsubscribeFromCandles(symbol, interval);

        socket.emit('unsubscribed', { type: 'candles', symbol, interval });
      } catch (error: any) {
        console.error(`[HyperliquidSocket] Error unsubscribing from candles ${symbol} ${interval}:`, error);
      }
    });

    /**
     * Unsubscribe from all mids
     */
    socket.on('unsubscribe:mids', async () => {
      try {
        console.log(`[HyperliquidSocket] ${socket.id} unsubscribing from all mids`);

        leaveRoom(socket, 'allMids');
        await marketDataService.unsubscribeFromAllMids();

        socket.emit('unsubscribed', { type: 'mids' });
      } catch (error: any) {
        console.error('[HyperliquidSocket] Error unsubscribing from mids:', error);
      }
    });

    /**
     * Unsubscribe from user events
     */
    socket.on('unsubscribe:userEvents', async (userAddress: string) => {
      try {
        console.log(`[HyperliquidSocket] ${socket.id} unsubscribing from userEvents: ${userAddress}`);

        leaveRoom(socket, `userEvents:${userAddress}`);
        await marketDataService.unsubscribeFromUserEvents(userAddress);

        socket.emit('unsubscribed', { type: 'userEvents', userAddress });
      } catch (error: any) {
        console.error(`[HyperliquidSocket] Error unsubscribing from userEvents ${userAddress}:`, error);
      }
    });

    /**
     * Unsubscribe from order updates
     */
    socket.on('unsubscribe:orders', async ({ userId, userAddress }: { userId: string; userAddress: string }) => {
      try {
        console.log(`[HyperliquidSocket] ${socket.id} unsubscribing from orders: userId=${userId}`);

        leaveRoom(socket, `orders:${userId}`);
        await orderStatusService.unsubscribeFromUserOrders(userAddress);

        socket.emit('unsubscribed', { type: 'orders', userId });
      } catch (error: any) {
        console.error(`[HyperliquidSocket] Error unsubscribing from orders for user ${userId}:`, error);
      }
    });

    /**
     * Unsubscribe from position updates
     */
    socket.on('unsubscribe:positions', async ({ userId }: { userId: string }) => {
      try {
        console.log(`[HyperliquidSocket] ${socket.id} unsubscribing from positions: userId=${userId}`);

        leaveRoom(socket, `positions:${userId}`);
        positionService.stopPositionPolling(userId);

        socket.emit('unsubscribed', { type: 'positions', userId });
      } catch (error: any) {
        console.error(`[HyperliquidSocket] Error unsubscribing from positions for user ${userId}:`, error);
      }
    });

    /**
     * Get subscription stats
     */
    socket.on('getStats', () => {
      const marketDataStats = marketDataService.getStats();
      const cacheStats = cache.getStats();
      const orderStatusStats = {
        subscriptions: orderStatusService.getSubscriptionCount(),
        activeUsers: orderStatusService.getActiveSubscriptions(),
      };

      socket.emit('stats', {
        marketData: marketDataStats,
        cache: cacheStats,
        orderStatus: orderStatusStats,
      });
    });

    /**
     * Handle disconnect
     */
    socket.on('disconnect', async () => {
      console.log(`[HyperliquidSocket] Client disconnected: ${socket.id}`);

      // Clean up subscriptions for this client
      const rooms = roomMemberships.get(socket.id);
      if (rooms) {
        for (const room of rooms) {
          // Parse room name to determine subscription type
          if (room.startsWith('orderbook:')) {
            const symbol = room.replace('orderbook:', '');
            await marketDataService.unsubscribeFromOrderbook(symbol).catch(() => {});
          } else if (room.startsWith('trades:')) {
            const symbol = room.replace('trades:', '');
            await marketDataService.unsubscribeFromTrades(symbol).catch(() => {});
          } else if (room.startsWith('candles:')) {
            const [, symbol, interval] = room.split(':');
            await marketDataService.unsubscribeFromCandles(symbol, interval).catch(() => {});
          } else if (room === 'allMids') {
            await marketDataService.unsubscribeFromAllMids().catch(() => {});
          } else if (room.startsWith('userEvents:')) {
            const userAddress = room.replace('userEvents:', '');
            await marketDataService.unsubscribeFromUserEvents(userAddress).catch(() => {});
          } else if (room.startsWith('orders:')) {
            // Extract userAddress from room (format: orders:userId)
            // Note: We need userAddress to unsubscribe, but we only have userId in room name
            // This is a limitation - we might need to track userId -> userAddress mapping
            console.log(`[HyperliquidSocket] Order subscription cleanup for room: ${room}`);
            // For now, we'll let the subscription remain active until explicit unsubscribe
            // or implement a userId -> userAddress mapping in the future
          } else if (room.startsWith('positions:')) {
            // Stop position polling for this user
            const userId = room.replace('positions:', '');
            positionService.stopPositionPolling(userId);
            console.log(`[HyperliquidSocket] Position polling stopped for user: ${userId}`);
          }
        }

        roomMemberships.delete(socket.id);
      }
    });
  });

  console.log('[HyperliquidSocket] Socket.io handlers initialized');
}
