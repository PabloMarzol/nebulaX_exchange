import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { onrampMoneyService } from '../services/onrampMoneyService.js';
import { zeroXSwapService } from '../services/zeroXSwapService.js';
import { db } from '../db/index.js';
import { swapOrders, onrampOrders } from '@shared/schema/swap.schema.js';
import { z } from 'zod';
import { eq, desc } from 'drizzle-orm';
import dotenv from "dotenv";

dotenv.config()

const router = Router();

// ======================
// Unified Onramp Routes - Embedded Flow
// ======================

/**
 * POST /api/onramp/quote
 * Get onramp quote for embedded flow
 * Supports both Meld.io and OnRamp.Money quotes
 */
router.post('/quote', async (req, res, next) => {
  try {
    const schema = z.object({
      provider: z.enum(['meld', 'onramp_money']),
      fiatAmount: z.number().positive().min(10).max(100000),
      fiatCurrency: z.string().length(3),
      cryptoCurrency: z.string().min(2).max(20),
      network: z.string().min(2).max(50),
      walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
    });

    const data = schema.parse(req.body);

    let quote;

    if (data.provider === 'meld') {
      // For Meld.io, we'll use 0x protocol as fallback for quote
      // This is a placeholder - actual Meld.io API integration would go here
      quote = await getMeldQuote(data);
    } else if (data.provider === 'onramp_money') {
      // For OnRamp.Money, we calculate based on their API
      quote = await onrampMoneyService.getQuote(data);
    }

    res.json({
      success: true,
      provider: data.provider,
      quote,
      expiresAt: new Date(Date.now() + 30000), // 30 seconds
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/onramp/submit
 * Submit onramp order for embedded flow
 */
router.post('/submit', authenticate, async (req, res, next) => {
  try {
    const schema = z.object({
      provider: z.enum(['meld', 'onramp_money']),
      quoteId: z.string(),
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

    let order;

    if (data.provider === 'meld') {
      order = await createMeldOrder({
        userId: req.user!.id,
        ...data,
      });
    } else if (data.provider === 'onramp_money') {
      order = await onrampMoneyService.createOrder({
        userId: req.user!.id,
        fiatAmount: data.fiatAmount,
        fiatCurrency: data.fiatCurrency,
        cryptoCurrency: data.cryptoCurrency,
        network: data.network,
        walletAddress: data.walletAddress,
        paymentMethod: data.paymentMethod,
        phoneNumber: data.phoneNumber,
        language: data.language || 'en',
      });
    }

    // Create embedded order record
    // For OnRamp Money, order.id is the DB ID, but we also have providerOrderId in the object if we used createDirectOrder logic?
    // Actually, createOrder returns the DB object structure.
    // Let's ensure we capture the external ID.
    const providerOrderId = (order as any).providerOrderId || order.id;

    const [embeddedOrder] = await db
      .insert(onrampOrders)
      .values({
        userId: req.user!.id,
        providerOrderId: providerOrderId.toString(),
        provider: data.provider,
        fiatAmount: data.fiatAmount.toString(),
        fiatCurrency: data.fiatCurrency,
        cryptoCurrency: data.cryptoCurrency,
        network: data.network,
        walletAddress: data.walletAddress,
        status: 'pending',
        metadata: JSON.stringify({
          quoteId: data.quoteId,
          originalOrder: order,
          embeddedFlow: true,
        }),
      })
      .returning();

    res.json({
      success: true,
      order: {
        id: embeddedOrder.id,
        provider: data.provider,
        status: 'pending',
        orderData: order,
        embeddedUrl: data.provider === 'meld' ? await getMeldEmbedUrl(order) : (order as any).onrampUrl,
        // Include direct API details suitable for whitelabel
        depositAddress: (order as any).depositAddress,
        endTime: (order as any).endTime,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/onramp/status/:orderId
 * Get embedded onramp order status
 */
router.get('/status/:orderId', authenticate, async (req, res, next) => {
  try {
    const { orderId } = req.params;

    const [order] = await db
      .select()
      .from(onrampOrders)
      .where(eq(onrampOrders.id, orderId))
      .limit(1);

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found',
      });
    }

    // Get detailed status from provider
    let detailedStatus: any = {};
    
    if (order.provider === 'onramp_money' && order.providerOrderId) {
      // Use pollOrderStatus to get fresh data from API
      try {
        detailedStatus = await onrampMoneyService.pollOrderStatus(order.providerOrderId);
        // Also update local status if changed? 
        // We could, but let's leave that to webhooks/callbacks to be the source of truth for DB,
        // while this endpoint returns live data for UI.
        // However, if we get KYC needed, passing it to UI is critical.
      } catch (e) {
        console.error('Failed to poll status', e);
        // Fallback or ignore
      }
    } else if (order.provider === 'meld') {
      detailedStatus = await getMeldOrderStatus(order.providerOrderId);
    }

    res.json({
      success: true,
      order: {
        id: order.id,
        provider: order.provider,
        status: order.status,
        fiatAmount: parseFloat(order.fiatAmount),
        fiatCurrency: order.fiatCurrency,
        cryptoCurrency: order.cryptoCurrency,
        network: order.network,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        detailedStatus, // Now contains { status, kycNeeded, ... } from OnRamp API
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/onramp/webhook/:provider
 * Handle webhooks for embedded onramp flows
 */
router.post('/webhook/:provider', async (req, res, next) => {
  try {
    const { provider } = req.params;
    
    if (provider === 'onramp_money') {
      // Handle OnRamp.Money webhook
      const payload = req.headers['x-onramp-payload'] as string;
      const signature = req.headers['x-onramp-signature'] as string;

      if (!payload || !signature) {
        return res.status(400).json({ success: false, error: 'Missing headers' });
      }

      const isValid = onrampMoneyService.verifyWebhookSignature(payload, signature);
      if (!isValid) {
        return res.status(403).json({ success: false, error: 'Invalid signature' });
      }

      const decoded = JSON.parse(Buffer.from(payload, 'base64').toString());
      
      // Update embedded order status
      await updateEmbeddedOrderFromWebhook(provider, decoded);
      
      // Handle the webhook data
      await onrampMoneyService.handleWebhook(decoded);

      res.json({ success: true });
    } else if (provider === 'meld') {
      // Handle Meld.io webhook
      await updateEmbeddedOrderFromWebhook(provider, req.body);
      res.json({ success: true });
    } else {
      return res.status(400).json({
        success: false,
        error: 'Unsupported provider',
      });
    }
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/onramp/providers
 * Get available onramp providers and their capabilities
 */
router.get('/providers', async (req, res) => {
  const providers = {
    meld: {
      name: 'Meld.io',
      displayName: 'Meld.io (Instant)',
      capabilities: {
        embedded: true, // We'll implement this
        fiatCurrencies: ['USD', 'EUR', 'GBP'],
        cryptoCurrencies: ['ETH', 'USDC', 'USDT', 'BTC'],
        networks: ['ethereum', 'polygon', 'arbitrum'],
        paymentMethods: ['card', 'bank_transfer'],
        kycRequired: true,
        minAmount: 10,
        maxAmount: 50000,
      },
      fees: {
        processing: '2.5%',
        network: 'Variable',
      },
      processingTime: '2-10 minutes',
    },
    onramp_money: {
      name: 'OnRamp.Money',
      displayName: 'OnRamp.Money',
      capabilities: {
        embedded: false, // Currently redirect-only
        fiatCurrencies: ['USD', 'EUR', 'GBP', 'INR', 'TRY', 'AED', 'MXN', 'VND', 'NGN'],
        cryptoCurrencies: ['USDT', 'USDC', 'ETH', 'MATIC', 'BNB'],
        networks: ['erc20', 'bep20', 'matic20', 'trc20', 'arbitrum', 'optimism', 'base', 'solana'],
        paymentMethods: ['instant', 'bank_transfer'],
        kycRequired: true,
        minAmount: 10,
        maxAmount: 100000,
      },
      fees: {
        processing: '1.5-3%',
        network: 'Variable',
      },
      processingTime: '5-30 minutes',
    },
  };

  res.json({
    success: true,
    providers,
    recommendations: {
      default: 'meld', // Default to Meld for embedded experience
      fallback: 'onramp_money',
    },
  });
});

/**
 * GET /api/onramp/history
 * Get user's embedded onramp history
 */
router.get('/history', authenticate, async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const provider = req.query.provider as string;

    let query = db
      .select()
      .from(onrampOrders)
      .where(eq(onrampOrders.userId, req.user!.id))
      .orderBy(desc(onrampOrders.createdAt))
      .limit(limit);

    // Filter by provider if specified
    if (provider) {
      query = query.where(eq(onrampOrders.provider, provider));
    }

    const orders = await query;

    res.json({
      success: true,
      orders: orders.map(order => ({
        id: order.id,
        provider: order.provider,
        status: order.status,
        fiatAmount: parseFloat(order.fiatAmount),
        fiatCurrency: order.fiatCurrency,
        cryptoCurrency: order.cryptoCurrency,
        network: order.network,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
      })),
    });
  } catch (error) {
    next(error);
  }
});

// ======================
// Helper Functions
// ======================

async function getMeldQuote(data: any) {
  // Placeholder for Meld.io API integration
  // This would make actual API calls to Meld.io for quotes
  return {
    id: `meld_quote_${Date.now()}`,
    fiatAmount: data.fiatAmount,
    fiatCurrency: data.fiatCurrency,
    cryptoAmount: data.fiatAmount * 0.95, // Simplified rate calculation
    cryptoCurrency: data.cryptoCurrency,
    network: data.network,
    fee: {
      processing: data.fiatAmount * 0.025, // 2.5%
      network: 0.001,
    },
    total: data.fiatAmount,
    rate: 0.95, // USD to crypto rate
    expiresAt: new Date(Date.now() + 30000),
  };
}

async function createMeldOrder(data: any) {
  // Placeholder for Meld.io order creation
  return {
    id: `meld_order_${Date.now()}`,
    status: 'pending',
    onrampUrl: `${process.env.FRONTEND_URL}/embedded/onramp/meld/${Date.now()}`,
    createdAt: new Date(),
  };
}

async function getMeldEmbedUrl(order: any) {
  // Generate embed URL for Meld.io
  return `${process.env.FRONTEND_URL}/embedded/onramp/meld/${order.id}`;
}

async function getMeldOrderStatus(orderId: string) {
  // Placeholder for Meld.io status checking
  return {
    status: 'pending',
    provider: 'meld',
    externalOrderId: orderId,
  };
}

async function updateEmbeddedOrderFromWebhook(provider: string, webhookData: any) {
  // Update embedded order status based on provider webhook
  try {
    const { merchantRecognitionId, status } = webhookData;

    if (merchantRecognitionId) {
      const [order] = await db
        .select()
        .from(onrampOrders)
        .where(eq(onrampOrders.providerOrderId, merchantRecognitionId))
        .limit(1);

      if (order) {
        await db
          .update(onrampOrders)
          .set({
            status: mapProviderStatusToEmbedded(provider, status),
            metadata: JSON.stringify({
              ...(order.metadata ? JSON.parse(order.metadata) : {}),
              lastWebhook: webhookData,
              webhookReceivedAt: new Date().toISOString(),
            }),
            updatedAt: new Date(),
          })
          .where(eq(onrampOrders.id, order.id));
      }
    }
  } catch (error) {
    console.error('Error updating embedded order from webhook:', error);
  }
}

function mapProviderStatusToEmbedded(provider: string, status: any): string {
  // Map provider-specific statuses to our unified status
  if (provider === 'onramp_money') {
    const statusNum = Number(status);
    const successStatuses = [4, 15, 19, 40, 41];
    const failedStatuses = [-1, -2, -3, -4];
    
    if (successStatuses.includes(statusNum)) return 'completed';
    if (failedStatuses.includes(statusNum)) return 'failed';
    return 'processing';
  }
  
  // Default mapping for other providers
  return 'processing';
}

export default router;
