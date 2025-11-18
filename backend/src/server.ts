import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import helmet from 'helmet';
import cors from 'cors';
import dotenv from 'dotenv';
import { env } from './config/env.js';
import { errorHandler } from './middleware/error.middleware.js';
import { requestLogger } from './middleware/logging.middleware.js';
import { apiLimiter } from './middleware/rateLimit.middleware.js';

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

// Rate limiting
app.use('/api/', apiLimiter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/trading', tradingRoutes);
app.use('/api/swap', swapRoutes);
app.use('/api/market', marketRoutes);
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/ai', aiRoutes);

// WebSocket
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('subscribe', (data: { symbol: string }) => {
    socket.join(`market:${data.symbol}`);
    console.log(`Client ${socket.id} subscribed to ${data.symbol}`);
  });

  socket.on('unsubscribe', (data: { symbol: string }) => {
    socket.leave(`market:${data.symbol}`);
    console.log(`Client ${socket.id} unsubscribed from ${data.symbol}`);
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
});

export { app, io };
