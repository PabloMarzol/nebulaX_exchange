import { Router, Request, Response } from 'express';
import { getHyperliquidClient } from '../services/hyperliquid/HyperliquidClient';
import { getMarketDataCache } from '../services/hyperliquid/MarketDataCache';
import { getMarketDataService } from '../services/hyperliquid/MarketDataService';
import { getOrderExecutionService } from '../services/hyperliquid/OrderExecutionService';

const router = Router();
const client = getHyperliquidClient();
const cache = getMarketDataCache();
const marketDataService = getMarketDataService();
const orderExecutionService = getOrderExecutionService();

/**
 * GET /api/hyperliquid/symbols
 * Get all available trading symbols
 */
router.get('/symbols', async (req: Request, res: Response) => {
  try {
    const metas = await client.getAllMetas();
    res.json({
      success: true,
      data: metas.universe.map((meta: any) => ({
        name: meta.name,
        szDecimals: meta.szDecimals,
      })),
    });
  } catch (error: any) {
    console.error('[HyperliquidRoutes] Error fetching symbols:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch symbols',
      message: error.message,
    });
  }
});

/**
 * GET /api/hyperliquid/mids
 * Get mid prices for all symbols
 */
router.get('/mids', async (req: Request, res: Response) => {
  try {
    // Try cache first
    let mids = cache.getAllMids();

    // If not in cache, fetch from API
    if (!mids) {
      mids = await client.getAllMids();
      cache.setAllMids(mids);
    }

    res.json({
      success: true,
      data: mids,
      cached: cache.getAllMids() !== null,
    });
  } catch (error: any) {
    console.error('[HyperliquidRoutes] Error fetching mids:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch mid prices',
      message: error.message,
    });
  }
});

/**
 * GET /api/hyperliquid/orderbook/:symbol
 * Get orderbook for a specific symbol
 */
router.get('/orderbook/:symbol', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;

    // Try cache first
    let orderbook = cache.getOrderbook(symbol);

    // If not in cache, fetch from API
    if (!orderbook) {
      const data = await client.getOrderbook(symbol);
      cache.setOrderbook(symbol, data);
      orderbook = cache.getOrderbook(symbol);
    }

    res.json({
      success: true,
      data: orderbook,
      cached: cache.getOrderbook(symbol) !== null,
    });
  } catch (error: any) {
    console.error(`[HyperliquidRoutes] Error fetching orderbook for ${req.params.symbol}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch orderbook',
      message: error.message,
    });
  }
});

/**
 * GET /api/hyperliquid/trades/:symbol
 * Get recent trades for a symbol
 */
router.get('/trades/:symbol', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

    // Get from cache
    const trades = cache.getTrades(symbol, limit);

    if (!trades || trades.length === 0) {
      res.json({
        success: true,
        data: [],
        message: 'No cached trades available. Subscribe to real-time feed for updates.',
      });
      return;
    }

    res.json({
      success: true,
      data: trades,
      cached: true,
    });
  } catch (error: any) {
    console.error(`[HyperliquidRoutes] Error fetching trades for ${req.params.symbol}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch trades',
      message: error.message,
    });
  }
});

/**
 * GET /api/hyperliquid/candles/:symbol
 * Get candle data for a symbol
 */
router.get('/candles/:symbol', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    const interval = (req.query.interval as string) || '1h';
    const startTime = req.query.startTime
      ? parseInt(req.query.startTime as string)
      : Date.now() - 86400000; // Default: last 24 hours
    const endTime = req.query.endTime ? parseInt(req.query.endTime as string) : Date.now();

    // Try cache first
    let candles = cache.getCandles(symbol, interval);

    // If not in cache or insufficient data, fetch from API
    if (!candles || candles.length === 0) {
      const data = await client.getCandleSnapshot({
        symbol,
        interval,
        startTime,
        endTime,
      });

      // Cache the result
      if (data && Array.isArray(data)) {
        cache.setCandles(symbol, interval, data);
        candles = data;
      }
    }

    res.json({
      success: true,
      data: candles || [],
      cached: cache.getCandles(symbol, interval) !== null,
    });
  } catch (error: any) {
    console.error(`[HyperliquidRoutes] Error fetching candles for ${req.params.symbol}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch candles',
      message: error.message,
    });
  }
});

/**
 * GET /api/hyperliquid/user/:address/state
 * Get user's clearinghouse state (positions, margin, etc.)
 */
router.get('/user/:address/state', async (req: Request, res: Response) => {
  try {
    const { address } = req.params;

    // Validate address format
    if (!address.match(/^0x[a-fA-F0-9]{40}$/)) {
      res.status(400).json({
        success: false,
        error: 'Invalid Ethereum address',
      });
      return;
    }

    const userState = await client.getUserState(address);

    res.json({
      success: true,
      data: userState,
    });
  } catch (error: any) {
    console.error(`[HyperliquidRoutes] Error fetching user state for ${req.params.address}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user state',
      message: error.message,
    });
  }
});

/**
 * GET /api/hyperliquid/user/:address/orders
 * Get user's open orders
 */
router.get('/user/:address/orders', async (req: Request, res: Response) => {
  try {
    const { address } = req.params;

    // Validate address format
    if (!address.match(/^0x[a-fA-F0-9]{40}$/)) {
      res.status(400).json({
        success: false,
        error: 'Invalid Ethereum address',
      });
      return;
    }

    const orders = await client.getOpenOrders(address);

    res.json({
      success: true,
      data: orders,
    });
  } catch (error: any) {
    console.error(`[HyperliquidRoutes] Error fetching orders for ${req.params.address}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch orders',
      message: error.message,
    });
  }
});

/**
 * GET /api/hyperliquid/stats
 * Get service statistics
 */
router.get('/stats', (req: Request, res: Response) => {
  try {
    const marketDataStats = marketDataService.getStats();
    const cacheStats = cache.getStats();
    const activeSubscriptions = marketDataService.getActiveSubscriptions();

    res.json({
      success: true,
      data: {
        marketData: marketDataStats,
        cache: cacheStats,
        activeSubscriptions: activeSubscriptions.map((sub) => ({
          type: sub.type,
          symbol: sub.symbol,
          interval: sub.interval,
          subscribers: sub.subscriberCount,
          lastUpdate: sub.lastUpdate,
        })),
      },
    });
  } catch (error: any) {
    console.error('[HyperliquidRoutes] Error fetching stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch stats',
      message: error.message,
    });
  }
});

/**
 * POST /api/hyperliquid/orders
 * Place a new order
 */
router.post('/orders', async (req: Request, res: Response) => {
  try {
    const {
      userId,
      userAddress,
      symbol,
      side,
      orderType,
      price,
      size,
      timeInForce,
      reduceOnly,
      postOnly,
      clientOrderId,
    } = req.body;

    // Validate required fields
    if (!userId || !userAddress || !symbol || !side || !orderType || !size) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: userId, userAddress, symbol, side, orderType, size',
      });
    }

    // Place order
    const result = await orderExecutionService.placeOrder({
      userId,
      userAddress,
      symbol,
      side,
      orderType,
      price,
      size,
      timeInForce,
      reduceOnly,
      postOnly,
      clientOrderId,
    });

    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error: any) {
    console.error('[HyperliquidRoutes] Error placing order:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to place order',
      message: error.message,
    });
  }
});

/**
 * GET /api/hyperliquid/orders/:userId
 * Get orders for a user
 */
router.get('/orders/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { limit } = req.query;

    const orders = await orderExecutionService.getUserOrders(
      userId,
      limit ? parseInt(limit as string) : 100
    );

    res.json({
      success: true,
      data: orders,
      count: orders.length,
    });
  } catch (error: any) {
    console.error('[HyperliquidRoutes] Error fetching user orders:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch orders',
      message: error.message,
    });
  }
});

/**
 * GET /api/hyperliquid/orders/:userId/open
 * Get open orders for a user
 */
router.get('/orders/:userId/open', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const orders = await orderExecutionService.getUserOpenOrders(userId);

    res.json({
      success: true,
      data: orders,
      count: orders.length,
    });
  } catch (error: any) {
    console.error('[HyperliquidRoutes] Error fetching open orders:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch open orders',
      message: error.message,
    });
  }
});

/**
 * GET /api/hyperliquid/orders/order/:orderId
 * Get a specific order by internal order ID
 */
router.get('/orders/order/:orderId', async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;

    const order = await orderExecutionService.getOrderByInternalId(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found',
      });
    }

    res.json({
      success: true,
      data: order,
    });
  } catch (error: any) {
    console.error('[HyperliquidRoutes] Error fetching order:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch order',
      message: error.message,
    });
  }
});

/**
 * DELETE /api/hyperliquid/orders/:orderId
 * Cancel an order
 */
router.delete('/orders/:orderId', async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const { userId, userAddress, symbol } = req.body;

    // Validate required fields
    if (!userId || !userAddress || !symbol) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: userId, userAddress, symbol',
      });
    }

    const result = await orderExecutionService.cancelOrder({
      userId,
      userAddress,
      orderId,
      symbol,
    });

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error: any) {
    console.error('[HyperliquidRoutes] Error cancelling order:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cancel order',
      message: error.message,
    });
  }
});

/**
 * DELETE /api/hyperliquid/orders/:userId/all
 * Cancel all orders for a symbol
 */
router.delete('/orders/:userId/all', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { userAddress, symbol } = req.body;

    // Validate required fields
    if (!userAddress || !symbol) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: userAddress, symbol',
      });
    }

    const result = await orderExecutionService.cancelAllOrders({
      userId,
      userAddress,
      symbol,
    });

    res.json(result);
  } catch (error: any) {
    console.error('[HyperliquidRoutes] Error cancelling all orders:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cancel all orders',
      message: error.message,
    });
  }
});

/**
 * GET /api/hyperliquid/orders/limits/:symbol
 * Get order size limits for a symbol
 */
router.get('/orders/limits/:symbol', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;

    const limits = await orderExecutionService.getOrderLimits(symbol);

    res.json({
      success: true,
      data: limits,
    });
  } catch (error: any) {
    console.error('[HyperliquidRoutes] Error fetching order limits:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch order limits',
      message: error.message,
    });
  }
});

/**
 * POST /api/hyperliquid/orders/fees/estimate
 * Estimate order fees
 */
router.post('/orders/fees/estimate', (req: Request, res: Response) => {
  try {
    const { symbol, size, price, isMaker } = req.body;

    // Validate required fields
    if (!symbol || !size || !price || isMaker === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: symbol, size, price, isMaker',
      });
    }

    const fees = orderExecutionService.estimateFees({
      symbol,
      size,
      price,
      isMaker,
    });

    res.json({
      success: true,
      data: fees,
    });
  } catch (error: any) {
    console.error('[HyperliquidRoutes] Error estimating fees:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to estimate fees',
      message: error.message,
    });
  }
});

/**
 * GET /api/hyperliquid/health
 * Health check endpoint
 */
router.get('/health', (req: Request, res: Response) => {
  const config = client.getConfig();

  res.json({
    success: true,
    status: 'healthy',
    config: {
      network: config.testnet ? 'testnet' : 'mainnet',
    },
  });
});

export default router;
