import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { zeroXSwapService } from '../services/zeroXSwapService.js';
import { onrampMoneyService } from '../services/onrampMoneyService.js';
import { db } from '../db/index.js';
import { swapOrders } from '@shared/schema/swap.schema.js';
import { z } from 'zod';

const router = Router();

// ======================
// 0x Protocol Swap Routes
// ======================

/**
 * GET /api/swap/quote
 * Get a swap quote from 0x Protocol
 */
router.post('/quote', authenticate, async (req, res, next) => {
  try {
    const schema = z.object({
      sellToken: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
      buyToken: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
      sellAmount: z.string().optional(),
      buyAmount: z.string().optional(),
      takerAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
      slippagePercentage: z.number().min(0).max(1).optional(),
      chainId: z.number().int().positive(),
    });

    const data = schema.parse(req.body);

    const quote = await zeroXSwapService.getSwapQuote(data);

    res.json({
      success: true,
      quote,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/swap/price
 * Get a price quote (lighter version)
 */
router.post('/price', async (req, res, next) => {
  try {
    const schema = z.object({
      sellToken: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
      buyToken: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
      sellAmount: z.string().optional(),
      buyAmount: z.string().optional(),
      chainId: z.number().int().positive(),
    });

    const data = schema.parse(req.body);

    const price = await zeroXSwapService.getPriceQuote(data);

    res.json({
      success: true,
      price,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/swap/record
 * Record a swap transaction in the database
 */
router.post('/record', authenticate, async (req, res, next) => {
  try {
    const schema = z.object({
      sellToken: z.string(),
      buyToken: z.string(),
      sellAmount: z.string(),
      buyAmount: z.string(),
      sellTokenSymbol: z.string().optional(),
      buyTokenSymbol: z.string().optional(),
      chainId: z.number().int(),
      price: z.string(),
      guaranteedPrice: z.string().optional(),
      slippage: z.number().optional(),
      txHash: z.string().optional(),
      status: z.enum(['pending', 'submitted', 'confirmed', 'failed']).default('pending'),
    });

    const data = schema.parse(req.body);

    const [order] = await db
      .insert(swapOrders)
      .values({
        userId: req.user!.id,
        ...data,
        quoteExpiry: new Date(Date.now() + 30000), // 30 seconds
      })
      .returning();

    res.json({
      success: true,
      order: {
        id: order.id,
        sellToken: order.sellToken,
        buyToken: order.buyToken,
        sellAmount: order.sellAmount,
        buyAmount: order.buyAmount,
        chainId: order.chainId,
        price: order.price,
        status: order.status,
        txHash: order.txHash,
        createdAt: order.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/swap/:id/status
 * Update swap transaction status
 */
router.patch('/:id/status', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const schema = z.object({
      status: z.enum(['pending', 'submitted', 'confirmed', 'failed']),
      txHash: z.string().optional(),
      error: z.string().optional(),
    });

    const data = schema.parse(req.body);

    const [order] = await db
      .update(swapOrders)
      .set({
        status: data.status,
        ...(data.txHash && { txHash: data.txHash }),
        ...(data.error && { error: data.error }),
        ...(data.status === 'confirmed' && { confirmedAt: new Date() }),
        updatedAt: new Date(),
      })
      .where(eq(swapOrders.id, id))
      .returning();

    res.json({
      success: true,
      order: {
        id: order.id,
        status: order.status,
        txHash: order.txHash,
        updatedAt: order.updatedAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/swap/tokens
 * Get list of supported tokens for a chain
 */
router.get('/tokens/:chainId', async (req, res, next) => {
  try {
    const chainId = parseInt(req.params.chainId);

    if (isNaN(chainId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid chain ID',
      });
    }

    const tokens = await zeroXSwapService.getSupportedTokens(chainId);

    res.json({
      success: true,
      tokens,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/swap/allowance
 * Check token allowance for 0x Protocol
 */
router.post('/allowance', authenticate, async (req, res, next) => {
  try {
    const schema = z.object({
      tokenAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
      ownerAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
      chainId: z.number().int().positive(),
    });

    const data = schema.parse(req.body);

    const allowance = await zeroXSwapService.checkAllowance(
      data.tokenAddress,
      data.ownerAddress,
      data.chainId
    );

    res.json({
      success: true,
      allowance,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/swap/history
 * Get user's swap history
 */
router.get('/history', authenticate, async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;

    const orders = await db
      .select()
      .from(swapOrders)
      .where(eq(swapOrders.userId, req.user!.id))
      .orderBy(desc(swapOrders.createdAt))
      .limit(limit);

    res.json({
      success: true,
      orders,
    });
  } catch (error) {
    next(error);
  }
});

// ======================
// OnRamp Money Routes
// ======================

/**
 * POST /api/swap/onramp/create
 * Create a new OnRamp Money order
 */
router.post('/onramp/create', authenticate, async (req, res, next) => {
  try {
    const schema = z.object({
      fiatAmount: z.number().positive().min(10).max(100000),
      fiatCurrency: z.string().length(3),
      cryptoCurrency: z.string().min(2).max(20),
      network: z.string().min(2).max(50),
      walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
      paymentMethod: z.number().int().min(1).max(2),
      phoneNumber: z.string().optional(),
      language: z.string().length(2).optional(),
    });

    const data = schema.parse(req.body);

    const order = await onrampMoneyService.createOrder({
      userId: req.user!.id,
      ...data,
    });

    res.json({
      success: true,
      order,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/swap/onramp/callback
 * Handle OnRamp Money callback (redirect)
 */
router.get('/onramp/callback', async (req, res, next) => {
  try {
    const { orderId, merchantRecognitionId, status, cryptoAmount, txHash } = req.query;

    await onrampMoneyService.handleCallback({
      orderId: orderId as string,
      merchantRecognitionId: merchantRecognitionId as string,
      status: status as string,
      cryptoAmount: cryptoAmount as string,
      txHash: txHash as string,
    });

    // Redirect to frontend with status
    const redirectUrl = new URL(
      `/swap?onramp=success&status=${status}&merchantId=${merchantRecognitionId}`,
      process.env.FRONTEND_URL || 'http://localhost:5173'
    );

    res.redirect(redirectUrl.toString());
  } catch (error) {
    // Redirect to frontend with error
    const redirectUrl = new URL(
      `/swap?onramp=error`,
      process.env.FRONTEND_URL || 'http://localhost:5173'
    );

    res.redirect(redirectUrl.toString());
  }
});

/**
 * GET /api/swap/onramp/order/:id
 * Get OnRamp Money order by ID
 */
router.get('/onramp/order/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;

    const order = await onrampMoneyService.getOrderById(id, req.user!.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found',
      });
    }

    res.json({
      success: true,
      order,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/swap/onramp/orders
 * Get user's OnRamp Money orders
 */
router.get('/onramp/orders', authenticate, async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;

    const orders = await onrampMoneyService.getUserOrders(req.user!.id, limit);

    res.json({
      success: true,
      orders,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/swap/onramp/currencies
 * Get supported fiat currencies
 */
router.get('/onramp/currencies', (req, res) => {
  const currencies = onrampMoneyService.getSupportedCurrencies();
  res.json({
    success: true,
    currencies,
  });
});

/**
 * GET /api/swap/onramp/cryptos
 * Get supported cryptocurrencies and networks
 */
router.get('/onramp/cryptos', (req, res) => {
  const cryptos = onrampMoneyService.getSupportedCryptos();
  res.json({
    success: true,
    cryptos,
  });
});

// Import necessary functions
import { eq, desc } from 'drizzle-orm';

export default router;
