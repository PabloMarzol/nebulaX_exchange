import { Router, Request, Response } from 'express';
import { devAuth } from '../middleware/auth.middleware.js';
import { tradingLimiter } from '../middleware/rateLimit.middleware.js';
import { OrderExecutionService } from '../services/hyperliquid/OrderExecutionService.js';
import { z } from 'zod';

const router = Router();
const orderService = OrderExecutionService.getInstance();

// All trading routes require authentication (or use dev wallet from env)
router.use(devAuth);
router.use(tradingLimiter);

// Validation schemas
const placeOrderSchema = z.object({
  symbol: z.string().min(1, 'Symbol is required'),
  side: z.enum(['buy', 'sell'], { required_error: 'Side must be buy or sell' }),
  type: z.enum(['limit', 'market'], { required_error: 'Type must be limit or market' }),
  price: z.number().positive().optional(),
  quantity: z.number().positive('Quantity must be positive'),
  leverage: z.number().positive().optional(),
  timeInForce: z.enum(['Gtc', 'Ioc', 'Alo']).optional(),
  reduceOnly: z.boolean().optional(),
  postOnly: z.boolean().optional(),
});

const cancelOrderParamsSchema = z.object({
  id: z.string().min(1, 'Order ID is required'),
});

const symbolQuerySchema = z.object({
  symbol: z.string().optional(),
});

const orderHistoryQuerySchema = z.object({
  symbol: z.string().optional(),
  limit: z.string().optional(),
});

/**
 * POST /api/trading/orders
 * Place a new order
 */
router.post('/orders', async (req: Request, res: Response) => {
  try {
    const validation = placeOrderSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: validation.error.errors,
      });
    }

    const user = (req as any).user;
    if (!user || !user.walletAddress) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
      });
    }

    const result = await orderService.placeOrder({
      userId: user.id,
      userAddress: user.walletAddress,
      ...validation.data,
    });

    res.status(201).json(result);
  } catch (error: any) {
    console.error('Error placing order:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to place order',
    });
  }
});

/**
 * GET /api/trading/orders
 * Get user's order history
 */
router.get('/orders', async (req: Request, res: Response) => {
  try {
    const validation = orderHistoryQuerySchema.safeParse(req.query);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: validation.error.errors,
      });
    }

    const user = (req as any).user;
    if (!user || !user.walletAddress) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
      });
    }

    const { symbol, limit } = validation.data;
    const orders = await orderService.getOrderHistory(
      user.id,
      symbol,
      limit ? parseInt(limit) : 100
    );

    res.json({
      success: true,
      data: orders,
    });
  } catch (error: any) {
    console.error('Error fetching orders:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch orders',
    });
  }
});

/**
 * GET /api/trading/orders/open
 * Get user's open orders
 */
router.get('/orders/open', async (req: Request, res: Response) => {
  try {
    const validation = symbolQuerySchema.safeParse(req.query);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: validation.error.errors,
      });
    }

    const user = (req as any).user;
    if (!user || !user.walletAddress) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
      });
    }

    const { symbol } = validation.data;
    const orders = await orderService.getOpenOrders(user.id, symbol);

    res.json({
      success: true,
      data: orders,
    });
  } catch (error: any) {
    console.error('Error fetching open orders:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch open orders',
    });
  }
});

/**
 * DELETE /api/trading/orders/:id
 * Cancel a specific order
 */
router.delete('/orders/:id', async (req: Request, res: Response) => {
  try {
    const validation = cancelOrderParamsSchema.safeParse(req.params);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: validation.error.errors,
      });
    }

    const user = (req as any).user;
    if (!user || !user.walletAddress) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
      });
    }

    const { symbol } = req.query;
    if (!symbol || typeof symbol !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Symbol query parameter is required',
      });
    }

    const result = await orderService.cancelOrder({
      userId: user.id,
      userAddress: user.walletAddress,
      orderId: validation.data.id,
      symbol,
    });

    res.json(result);
  } catch (error: any) {
    console.error('Error canceling order:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to cancel order',
    });
  }
});

/**
 * DELETE /api/trading/orders
 * Cancel all orders (optionally for a specific symbol)
 */
router.delete('/orders', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user || !user.walletAddress) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
      });
    }

    const { symbol } = req.query;
    const result = await orderService.cancelAllOrders(
      user.id,
      symbol as string | undefined
    );

    res.json(result);
  } catch (error: any) {
    console.error('Error canceling all orders:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to cancel all orders',
    });
  }
});

/**
 * GET /api/trading/trades
 * Get user's trade history (fills)
 */
router.get('/trades', async (req: Request, res: Response) => {
  try {
    const walletAddress = (req as any).user?.walletAddress;
    if (!walletAddress) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
      });
    }

    // TODO: Implement trade history fetching from database
    // For now, return empty array
    res.json({
      success: true,
      data: [],
      message: 'Trade history will be implemented',
    });
  } catch (error: any) {
    console.error('Error fetching trades:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch trades',
    });
  }
});

/**
 * GET /api/trading/positions
 * Get user's open positions
 */
router.get('/positions', async (req: Request, res: Response) => {
  try {
    const validation = symbolQuerySchema.safeParse(req.query);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: validation.error.errors,
      });
    }

    const user = (req as any).user;
    if (!user || !user.walletAddress) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
      });
    }

    // Note: getPositions signature in OrderExecutionService might expect userId or address 
    // depending on how it calls API. 
    // OrderExecutionService.getPositions calls hlClient.getClearinghouseState(userId).
    // hlClient.getClearinghouseState expects ADDRESS.
    // So we MUST pass ADDRESS here if the service doesn't handle mapping.
    // BUT if we pass ADDRESS, the DB operations inside getPositions (inserting positions) 
    // will use ADDRESS as userId which fails UUID constraint!
    // 
    // We need to update OrderExecutionService.getPositions to accept BOTH.
    // Or pass user.id and let service handle it?
    // OrderExecutionService.ts: getPositions(userId: string, symbol?: string)
    // It uses userId for BOTH API call AND DB insert.
    // This is the core problem.
    // I need to update OrderExecutionService first to handle this split.
    
    // For now, I will leave this route using walletAddress BUT request User ID in service.
    // Wait, if I pass walletAddress, DB fails.
    // if I pass UUID, API fails ("invalid address").
    
    // I MUST update OrderExecutionService.getPositions signature.
    
    const { symbol } = validation.data;
    const positions = await orderService.getPositions(user.id, symbol, user.walletAddress); 

    res.json({
      success: true,
      data: positions,
    });
  } catch (error: any) {
    console.error('Error fetching positions:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch positions',
    });
  }
});

export default router;
