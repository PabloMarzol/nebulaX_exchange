import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import helmet from 'helmet';
import cors from 'cors';
import dotenv from 'dotenv';
import { env } from './config/env.js';
import { errorHandler } from './middleware/error.middleware.js';
import { requestLogger } from './middleware/logging.middleware.js';
import { apiLimiter, authLimiter, tradingLimiter, marketDataLimiter } from './middleware/rateLimit.middleware.js';
import { MarketDataService } from './services/hyperliquid/MarketDataService.js';

// Routes
import authRoutes from './routes/auth.routes.js';
import tradingRoutes from './routes/trading.routes.js';
import swapRoutes from './routes/swap.routes.js';
import marketRoutes from './routes/market.routes.js';
import portfolioRoutes from './routes/portfolio.routes.js';
import aiRoutes from './routes/ai.routes.js';

dotenv.config({ path: '../.env' });

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: env.FRONTEND_URL,
    credentials: true,
  },
});

// Middleware
app.use(helmet());
app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/trading', tradingLimiter, tradingRoutes);
app.use('/api/market', marketDataLimiter, marketRoutes);
app.use('/api/swap', apiLimiter, swapRoutes);
app.use('/api/portfolio', apiLimiter, portfolioRoutes);
app.use('/api/ai', apiLimiter, aiRoutes);

// Initialize MarketDataService
const marketDataService = MarketDataService.getInstance();
marketDataService.initialize(io);

// WebSocket - Market Data Subscriptions
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Subscribe to market data (orderbook, trades)
  socket.on('subscribe:market', async (data: { symbol: string }) => {
    try {
      socket.join(`market:${data.symbol}`);
      console.log(`Client ${socket.id} subscribed to market data for ${data.symbol}`);

      // Subscribe to orderbook and trades
      await marketDataService.subscribeToOrderbook(data.symbol);
      await marketDataService.subscribeToTrades(data.symbol);

      // Send cached data immediately
      const cachedOrderbook = marketDataService.getCachedOrderbook(data.symbol);
      const cachedTrades = marketDataService.getCachedTrades(data.symbol);

      if (cachedOrderbook) {
        socket.emit('orderbook:update', {
          symbol: data.symbol,
          data: cachedOrderbook,
          timestamp: Date.now(),
        });
      }

      if (cachedTrades.length > 0) {
        socket.emit('trades:update', {
          symbol: data.symbol,
          data: cachedTrades,
          timestamp: Date.now(),
        });
      }
    } catch (error) {
      console.error(`Failed to subscribe to market data for ${data.symbol}:`, error);
      socket.emit('error', { message: 'Failed to subscribe to market data' });
    }
  });

  // Subscribe to candles
  socket.on('subscribe:candles', async (data: { symbol: string; interval: string }) => {
    try {
      socket.join(`market:${data.symbol}:${data.interval}`);
      console.log(`Client ${socket.id} subscribed to candles for ${data.symbol} ${data.interval}`);

      await marketDataService.subscribeToCandles(data.symbol, data.interval);

      // Send cached candles immediately
      const cachedCandles = marketDataService.getCachedCandles(data.symbol, data.interval);
      if (cachedCandles.length > 0) {
        socket.emit('candles:snapshot', {
          symbol: data.symbol,
          interval: data.interval,
          data: cachedCandles,
          timestamp: Date.now(),
        });
      }
    } catch (error) {
      console.error(`Failed to subscribe to candles for ${data.symbol}:`, error);
      socket.emit('error', { message: 'Failed to subscribe to candles' });
    }
  });

  // Subscribe to price ticker (all mids)
  socket.on('subscribe:prices', () => {
    socket.join('prices');
    console.log(`Client ${socket.id} subscribed to price ticker`);

    // Send cached prices immediately
    const cachedPrices = marketDataService.getAllCachedMidPrices();
    if (cachedPrices.size > 0) {
      const pricesObj: Record<string, string> = {};
      cachedPrices.forEach((price, symbol) => {
        pricesObj[symbol] = price;
      });
      socket.emit('prices:update', {
        data: pricesObj,
        timestamp: Date.now(),
      });
    }
  });

  // Subscribe to user events (requires authentication)
  socket.on('subscribe:user', async (data: { userId: string; token?: string }) => {
    try {
      // TODO: Verify user authentication token
      socket.join(`user:${data.userId}`);
      console.log(`Client ${socket.id} subscribed to user events for ${data.userId}`);

      await marketDataService.subscribeToUserEvents(data.userId, (event) => {
        // User event handling will be done in the callback
        console.log(`User event for ${data.userId}:`, event);
      });
    } catch (error) {
      console.error(`Failed to subscribe to user events for ${data.userId}:`, error);
      socket.emit('error', { message: 'Failed to subscribe to user events' });
    }
  });

  // Unsubscribe from market data
  socket.on('unsubscribe:market', (data: { symbol: string }) => {
    socket.leave(`market:${data.symbol}`);
    console.log(`Client ${socket.id} unsubscribed from market data for ${data.symbol}`);

    // Check if any other clients are still subscribed
    const room = io.sockets.adapter.rooms.get(`market:${data.symbol}`);
    if (!room || room.size === 0) {
      marketDataService.unsubscribeFromOrderbook(data.symbol);
      marketDataService.unsubscribeFromTrades(data.symbol);
    }
  });

  // Unsubscribe from candles
  socket.on('unsubscribe:candles', (data: { symbol: string; interval: string }) => {
    socket.leave(`market:${data.symbol}:${data.interval}`);
    console.log(`Client ${socket.id} unsubscribed from candles for ${data.symbol} ${data.interval}`);

    // Check if any other clients are still subscribed
    const room = io.sockets.adapter.rooms.get(`market:${data.symbol}:${data.interval}`);
    if (!room || room.size === 0) {
      marketDataService.unsubscribeFromCandles(data.symbol, data.interval);
    }
  });

  // Unsubscribe from prices
  socket.on('unsubscribe:prices', () => {
    socket.leave('prices');
    console.log(`Client ${socket.id} unsubscribed from price ticker`);
  });

  // Unsubscribe from user events
  socket.on('unsubscribe:user', (data: { userId: string }) => {
    socket.leave(`user:${data.userId}`);
    console.log(`Client ${socket.id} unsubscribed from user events for ${data.userId}`);

    // Check if any other clients are still subscribed
    const room = io.sockets.adapter.rooms.get(`user:${data.userId}`);
    if (!room || room.size === 0) {
      marketDataService.unsubscribeFromUserEvents(data.userId);
    }
  });

  // Subscribe to AI portfolio signals
  socket.on('subscribe:ai-signals', (data: { userId: string }) => {
    socket.join(`ai-signals:${data.userId}`);
    console.log(`Client ${socket.id} subscribed to AI signals for ${data.userId}`);

    // Send initial acknowledgment
    socket.emit('ai-signals:subscribed', {
      message: 'Subscribed to AI signals',
      timestamp: Date.now()
    });
  });

  // Unsubscribe from AI signals
  socket.on('unsubscribe:ai-signals', (data: { userId: string }) => {
    socket.leave(`ai-signals:${data.userId}`);
    console.log(`Client ${socket.id} unsubscribed from AI signals for ${data.userId}`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Error handling (must be last)
app.use(errorHandler);

// Start server
const PORT = env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${env.NODE_ENV}`);
  console.log(`🌐 Frontend URL: ${env.FRONTEND_URL}`);
  console.log(`📡 WebSocket server initialized`);
  console.log(`💹 MarketDataService ready`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server');
  await marketDataService.cleanup();
  httpServer.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('SIGINT signal received: closing HTTP server');
  await marketDataService.cleanup();
  httpServer.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

export { app, io };
