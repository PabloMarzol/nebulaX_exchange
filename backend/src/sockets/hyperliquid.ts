import { Server as SocketIOServer, Socket } from 'socket.io';
import { getMarketDataService } from '../services/hyperliquid/MarketDataService';
import { getMarketDataCache } from '../services/hyperliquid/MarketDataCache';

/**
 * Setup Hyperliquid WebSocket handlers for Socket.io
 *
 * This module bridges Hyperliquid's WebSocket API with Socket.io,
 * allowing frontend clients to subscribe to real-time market data.
 *
 * Events emitted to clients:
 * - orderbook:update - Orderbook changes
 * - trades:update - New trades
 * - candles:update - Candle updates
 * - mids:update - Mid price updates
 * - userEvents:update - User-specific events
 *
 * Events received from clients:
 * - subscribe:orderbook - Subscribe to orderbook
 * - subscribe:trades - Subscribe to trades
 * - subscribe:candles - Subscribe to candles
 * - subscribe:mids - Subscribe to all mids
 * - subscribe:userEvents - Subscribe to user events
 * - unsubscribe:orderbook - Unsubscribe from orderbook
 * - unsubscribe:trades - Unsubscribe from trades
 * - unsubscribe:candles - Unsubscribe from candles
 * - unsubscribe:mids - Unsubscribe from all mids
 * - unsubscribe:userEvents - Unsubscribe from user events
 */

export function setupHyperliquidSocket(io: SocketIOServer) {
  const marketDataService = getMarketDataService();
  const cache = getMarketDataCache();

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
     * Get subscription stats
     */
    socket.on('getStats', () => {
      const marketDataStats = marketDataService.getStats();
      const cacheStats = cache.getStats();

      socket.emit('stats', {
        marketData: marketDataStats,
        cache: cacheStats,
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
          }
        }

        roomMemberships.delete(socket.id);
      }
    });
  });

  console.log('[HyperliquidSocket] Socket.io handlers initialized');
}
