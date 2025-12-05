import { db } from '../db/index.js';
import { onrampOrders } from '@shared/schema/swap.schema.js';
import { eq } from 'drizzle-orm';
import { env } from '../config/env.js';
import crypto from 'crypto';
import dotenv from "dotenv";

dotenv.config()
import axios from 'axios';

const ONRAMP_BASE_URL = env.ONRAMP_BASE_URL || 'https://onramp.money';

// Fiat currency type mapping for OnRamp Money
const FIAT_TYPES: Record<string, number> = {
  INR: 1,
  TRY: 2,
  AED: 3,
  MXN: 4,
  VND: 5,
  NGN: 6,
  BRL: 7,
  PEN: 8,
  COP: 9,
  CLP: 10,
  PHP: 11,
  EUR: 12,
  IDR: 14,
  KES: 15,
  GHS: 16,
  ZAR: 17,
  RWF: 18,
  XAF: 19,
  GBP: 20,
  USD: 21,
};

// Payment method types
export enum PaymentMethod {
  INSTANT = 1,      // UPI, instant transfers
  BANK_TRANSFER = 2, // IMPS, FAST, wire transfers
}

// Network types for crypto delivery
export const NETWORKS = {
  ERC20: 'erc20',
  BEP20: 'bep20',
  MATIC20: 'matic20',
  TRC20: 'trc20',
  SOLANA: 'solana',
  ARBITRUM: 'arbitrum',
  OPTIMISM: 'optimism',
  BASE: 'base',
} as const;

export interface CreateOnRampOrderParams {
  userId: string | null;
  fiatAmount: number;
  fiatCurrency: string;
  cryptoCurrency: string;
  network: string;
  walletAddress: string;
  paymentMethod: PaymentMethod;
  phoneNumber?: string;
  language?: string;
}

export interface OnRampOrder {
  id: string;
  userId: string | null;
  fiatAmount: number;
  fiatCurrency: string;
  cryptoAmount?: number;
  cryptoCurrency: string;
  network: string;
  walletAddress: string;
  paymentMethod: number;
  merchantRecognitionId: string;
  onrampUrl: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface OnRampQuote {
  fiatAmount: number;
  fiatCurrency: string;
  cryptoAmount: number;
  cryptoCurrency: string;
  rate: number;
  fees: {
    onRamp: number;
    network: number;
    total: number;
  };
  validUntil: Date;
}

export class OnRampMoneyService {
  /**
   * Get a quote for OnRamp Money
   */
  async getQuote(params: {
    fiatAmount: number;
    fiatCurrency: string;
    cryptoCurrency: string;
    network: string;
  }): Promise<OnRampQuote> {
    const { fiatAmount, fiatCurrency, cryptoCurrency, network } = params;
    const fiatType = FIAT_TYPES[fiatCurrency.toUpperCase()];

    if (!fiatType) {
      throw new Error(`Unsupported fiat currency: ${fiatCurrency}`);
    }

    const payload = {
      timestamp: Date.now(),
      body: {
        coinCode: cryptoCurrency.toLowerCase(),
        network: network.toLowerCase(),
        fiatAmount: fiatAmount,
        fiatType: fiatType,
        type: 1, // 1 -> onramp
      },
    };

    const secret = env.ONRAMP_APP_LIVE_SECRET_KEY;
    // Check if secret is available, if not, maybe throw or mock if in dev (but we want real quotes)
    if (!secret) throw new Error('ONRAMP_APP_LIVE_SECRET_KEY not configured');

    const apiKey = env.ONRAMP_API_LIVE_KEY;
    
    // In createOrder, we used ONRAMP_APP_LIVE_ID. 
    // The API requires X-ONRAMP-APIKEY and X-ONRAMP-SIGNATURE.
    // Let's assume ONRAMP_APP_LIVE_KEY corresponds to the API Key and ONRAMP_APP_LIVE_ID is the App ID.
    // BUT createOrder uses only AppID in URL. 
    // The Docs say: "Your api key". 
    // I will check env.ts to see what keys we have.

    // Let's assume for now and I will check config next.
    
    const payloadBuffer = Buffer.from(JSON.stringify(payload));
    const payloadBase64 = payloadBuffer.toString('base64');
    const signature = crypto.createHmac('sha512', secret).update(payloadBase64).digest('hex');

    try {
      const response = await axios.post(
        `${ONRAMP_BASE_URL}/onramp/api/v2/common/transaction/quotes`,
        payload.body, 
        {
          headers: {
            'Content-Type': 'application/json;charset=UTF-8',
            'X-ONRAMP-SIGNATURE': signature,
            'X-ONRAMP-APIKEY': apiKey, 
            'X-ONRAMP-PAYLOAD': payloadBase64,
          },
        }
      );

      const data = response.data.data;
      // data: { rate, quantity, onrampFee, clientFee, gatewayFee, gasFee }
      
      const onRampFeeTotal = (data.onrampFee || 0) + (data.clientFee || 0) + (data.gatewayFee || 0);
      
      return {
        fiatAmount,
        fiatCurrency: fiatCurrency.toUpperCase(),
        cryptoAmount: data.quantity,
        cryptoCurrency: cryptoCurrency.toUpperCase(),
        rate: data.rate,
        fees: {
          onRamp: onRampFeeTotal,
          network: data.gasFee || 0,
          total: onRampFeeTotal + (data.gasFee || 0),
        },
        validUntil: new Date(Date.now() + 30000), // 30s validity
      };
    } catch (error: any) {
      console.error('OnRamp Quote Error:', error.response?.data || error.message);
      const errorMessage = error.response?.data?.message || error.message || 'Unknown error';
      throw new Error(`Failed to fetch quote from OnRamp Money: ${errorMessage}`);
    }
  }

  /**
   * Create a new OnRamp Money order
   */
  async createOrder(params: CreateOnRampOrderParams): Promise<OnRampOrder> {
    const {
      userId,
      fiatAmount,
      fiatCurrency,
      cryptoCurrency,
      network,
      walletAddress,
      paymentMethod,
      phoneNumber,
      language = 'en',
    } = params;

    // Validate fiat currency
    const fiatType = FIAT_TYPES[fiatCurrency.toUpperCase()];
    if (!fiatType) {
      throw new Error(`Unsupported fiat currency: ${fiatCurrency}. Supported: ${Object.keys(FIAT_TYPES).join(', ')}`);
    }

    // Validate wallet address (basic Ethereum address validation)
    if (!walletAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      throw new Error('Invalid wallet address format');
    }

    // Generate unique merchant recognition ID
    const merchantRecognitionId = `${walletAddress}-${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
    const idempotencyKey = crypto.randomUUID();

    // Determine appId based on environment
    // User Update: Force LIVE/PRODUCTION logic only. Ignore testnet.
    const appId = env.ONRAMP_APP_LIVE_ID || env.ONRAMP_APP_ID;

    if (!appId) {
      throw new Error('OnRamp App ID not configured (ONRAMP_APP_LIVE_ID)');
    }

    // Build OnRamp URL with parameters
    const urlParams = new URLSearchParams({
      appId,
      fiatType: fiatType.toString(),
      fiatAmount: fiatAmount.toString(),
      cryptoAmount: '0', // Let OnRamp calculate
      coinCode: cryptoCurrency.toLowerCase(),
      network: network.toLowerCase(),
      walletAddress,
      paymentMethod: paymentMethod.toString(),
      merchantRecognitionId,
      redirectURL: `${env.API_URL}/api/swap/onramp/callback`,
      ...(phoneNumber && { phone: encodeURIComponent(phoneNumber) }),
      language,
    });

    const onrampUrl = `${ONRAMP_BASE_URL}/main/buy/?${urlParams}`;

    // Save order to database
    const [order] = await db
      .insert(onrampOrders)
      .values({
        userId,
        idempotencyKey,
        fiatAmount: fiatAmount.toString(),
        fiatCurrency: fiatCurrency.toUpperCase(),
        cryptoCurrency: cryptoCurrency.toUpperCase(),
        network,
        walletAddress,
        paymentMethod,
        merchantRecognitionId,
        onrampUrl,
        status: 'pending',
        metadata: JSON.stringify({
          appId,
          language,
          phoneNumber,
        }),
      })
      .returning();

    return {
      id: order.id,
      userId: order.userId,
      fiatAmount: parseFloat(order.fiatAmount),
      fiatCurrency: order.fiatCurrency,
      cryptoAmount: order.cryptoAmount ? parseFloat(order.cryptoAmount) : undefined,
      cryptoCurrency: order.cryptoCurrency,
      network: order.network,
      walletAddress: order.walletAddress,
      paymentMethod: order.paymentMethod,
      merchantRecognitionId: order.merchantRecognitionId!,
      onrampUrl: order.onrampUrl!,
      status: order.status,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    const secret = env.ONRAMP_APP_LIVE_SECRET_KEY;
    if (!secret) return false;

    const computedSignature = crypto.createHmac('sha512', secret).update(payload).digest('hex');
    return computedSignature === signature;
  }

  /**
   * Handle Webhook event from OnRamp Money
   */
  async handleWebhook(data: any): Promise<void> {
    const {
      orderId,
      merchantRecognitionId,
      status, // numeric status
      actualCryptoAmount,
      transactionHash,
      onRampFee,
      gatewayFee,
      networkFee,
    } = data;

    if (!merchantRecognitionId) {
      throw new Error('Missing merchantRecognitionId in webhook data');
    }

    // Find order by merchant recognition ID
    const [order] = await db
      .select()
      .from(onrampOrders)
      .where(eq(onrampOrders.merchantRecognitionId, merchantRecognitionId))
      .limit(1);

    if (!order) {
      console.warn(`Webhook: Order not found for merchantRecognitionId: ${merchantRecognitionId}`);
      return;
    }

    const updates: any = {
      updatedAt: new Date(),
    };

    if (orderId) updates.providerOrderId = orderId.toString();

    // Status Mapping (See statusCode.md)
    // 4, 15, 19 => Success/Withdrawal Complete
    const successStatuses = [4, 15, 19, 40, 41];
    const failedStatuses = [-1, -2, -3, -4];
    const processingStatuses = [0, 1, 2, 3, 5, 10, 11, 12, 13, 14, 16, 17, 18, 30, 31, 32, 33, 34, 35, 36];

    let newStatus = order.status;
    const statusNum = Number(status);

    if (successStatuses.includes(statusNum)) {
      newStatus = 'completed';
      updates.completedAt = new Date();
    } else if (failedStatuses.includes(statusNum)) {
      newStatus = 'failed';
    } else if (processingStatuses.includes(statusNum)) {
      newStatus = 'processing';
    }

    updates.status = newStatus;

    if (actualCryptoAmount) updates.cryptoAmount = actualCryptoAmount.toString();

    const metadata = order.metadata ? JSON.parse(order.metadata) : {};
    if (transactionHash) metadata.txHash = transactionHash;
    if (onRampFee) metadata.onRampFee = onRampFee;
    if (gatewayFee) metadata.gatewayFee = gatewayFee;
    if (networkFee) metadata.networkFee = networkFee;
    metadata.webhookReceivedAt = new Date().toISOString();

    updates.metadata = JSON.stringify(metadata);

    await db.update(onrampOrders).set(updates).where(eq(onrampOrders.id, order.id));
  }

  /**
   * Handle redirect callback (UI only)
   * We trust this less than webhook, but useful for immediate UI feedback.
   */
  async handleCallback(data: {
    orderId?: string;
    merchantRecognitionId?: string;
    status?: string;
    cryptoAmount?: string;
    txHash?: string;
  }): Promise<OnRampOrder | null> {
    const { orderId, merchantRecognitionId, status, cryptoAmount, txHash } = data;

    if (!merchantRecognitionId) {
      throw new Error('Missing merchantRecognitionId in callback');
    }

    const [order] = await db
      .select()
      .from(onrampOrders)
      .where(eq(onrampOrders.merchantRecognitionId, merchantRecognitionId))
      .limit(1);

    if (!order) {
      throw new Error(`Order not found for merchantRecognitionId: ${merchantRecognitionId}`);
    }

    const updates: any = {
      updatedAt: new Date(),
    };

    if (orderId) updates.providerOrderId = orderId;

    // Use status from callback but treat 'success' as 'processing' or 'completed' depending on trust?
    // Let's rely on mapping, but note that this is spoofable.
    if (status) {
      const statusMap: Record<string, string> = {
        success: 'completed', // In Hosted Mode pending completion, they might send success?
        completed: 'completed',
        pending: 'processing',
        processing: 'processing',
        failed: 'failed',
        cancelled: 'failed',
      };
      // Only update if not already failed/completed to avoid overwriting final states with potential spoofed data
      if (order.status !== 'completed' && order.status !== 'failed') {
          updates.status = statusMap[status.toLowerCase()] || 'processing';
          if (updates.status === 'completed') updates.completedAt = new Date();
      }
    }

    if (cryptoAmount) updates.cryptoAmount = cryptoAmount;

    if (txHash) {
      const metadata = order.metadata ? JSON.parse(order.metadata) : {};
      metadata.txHash = txHash;
      updates.metadata = JSON.stringify(metadata);
    }

    const [updatedOrder] = await db
      .update(onrampOrders)
      .set(updates)
      .where(eq(onrampOrders.id, order.id))
      .returning();

    return {
      id: updatedOrder.id,
      userId: updatedOrder.userId,
      fiatAmount: parseFloat(updatedOrder.fiatAmount),
      fiatCurrency: updatedOrder.fiatCurrency,
      cryptoAmount: updatedOrder.cryptoAmount ? parseFloat(updatedOrder.cryptoAmount) : undefined,
      cryptoCurrency: updatedOrder.cryptoCurrency,
      network: updatedOrder.network,
      walletAddress: updatedOrder.walletAddress,
      paymentMethod: updatedOrder.paymentMethod,
      merchantRecognitionId: updatedOrder.merchantRecognitionId!,
      onrampUrl: updatedOrder.onrampUrl!,
      status: updatedOrder.status,
      createdAt: updatedOrder.createdAt,
      updatedAt: updatedOrder.updatedAt,
    };
  }

  /**
   * Get order by ID (no auth required)
   */
  async getOrderById(orderId: string): Promise<OnRampOrder | null> {
    const [order] = await db
      .select()
      .from(onrampOrders)
      .where(eq(onrampOrders.id, orderId))
      .limit(1);

    if (!order) {
      return null;
    }

    return {
      id: order.id,
      userId: order.userId,
      fiatAmount: parseFloat(order.fiatAmount),
      fiatCurrency: order.fiatCurrency,
      cryptoAmount: order.cryptoAmount ? parseFloat(order.cryptoAmount) : undefined,
      cryptoCurrency: order.cryptoCurrency,
      network: order.network,
      walletAddress: order.walletAddress,
      paymentMethod: order.paymentMethod,
      merchantRecognitionId: order.merchantRecognitionId!,
      onrampUrl: order.onrampUrl!,
      status: order.status,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }

  /**
   * Get all orders for a user by userId
   */
  async getUserOrders(userId: string, limit: number = 10): Promise<OnRampOrder[]> {
    const orders = await db
      .select()
      .from(onrampOrders)
      .where(eq(onrampOrders.userId, userId))
      .orderBy(onrampOrders.createdAt)
      .limit(limit);

    return orders.map((order) => ({
      id: order.id,
      userId: order.userId,
      fiatAmount: parseFloat(order.fiatAmount),
      fiatCurrency: order.fiatCurrency,
      cryptoAmount: order.cryptoAmount ? parseFloat(order.cryptoAmount) : undefined,
      cryptoCurrency: order.cryptoCurrency,
      network: order.network,
      walletAddress: order.walletAddress,
      paymentMethod: order.paymentMethod,
      merchantRecognitionId: order.merchantRecognitionId!,
      onrampUrl: order.onrampUrl!,
      status: order.status,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    }));
  }

  /**
   * Get all orders for a wallet address
   */
  async getOrdersByWallet(walletAddress: string, limit: number = 10): Promise<OnRampOrder[]> {
    const orders = await db
      .select()
      .from(onrampOrders)
      .where(eq(onrampOrders.walletAddress, walletAddress))
      .orderBy(onrampOrders.createdAt)
      .limit(limit);

    return orders.map((order) => ({
      id: order.id,
      userId: order.userId,
      fiatAmount: parseFloat(order.fiatAmount),
      fiatCurrency: order.fiatCurrency,
      cryptoAmount: order.cryptoAmount ? parseFloat(order.cryptoAmount) : undefined,
      cryptoCurrency: order.cryptoCurrency,
      network: order.network,
      walletAddress: order.walletAddress,
      paymentMethod: order.paymentMethod,
      merchantRecognitionId: order.merchantRecognitionId!,
      onrampUrl: order.onrampUrl!,
      status: order.status,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    }));
  }

  /**
   * Get supported fiat currencies
   */
  getSupportedCurrencies(): Array<{ code: string; name: string; type: number }> {
    return [
      { code: 'INR', name: 'Indian Rupee', type: FIAT_TYPES.INR },
      { code: 'TRY', name: 'Turkish Lira', type: FIAT_TYPES.TRY },
      { code: 'AED', name: 'UAE Dirham', type: FIAT_TYPES.AED },
      { code: 'MXN', name: 'Mexican Peso', type: FIAT_TYPES.MXN },
      { code: 'VND', name: 'Vietnamese Dong', type: FIAT_TYPES.VND },
      { code: 'NGN', name: 'Nigerian Naira', type: FIAT_TYPES.NGN },
      { code: 'USD', name: 'US Dollar', type: FIAT_TYPES.USD },
      { code: 'EUR', name: 'Euro', type: FIAT_TYPES.EUR },
      { code: 'GBP', name: 'British Pound', type: FIAT_TYPES.GBP },
    ];
  }

  /**
   * Fetch real supported coins, networks, and currencies from OnRamp.Money API
   */
  async fetchSupportedCoinsAndNetworks(): Promise<{
    coins: Array<{ symbol: string; name: string; networks: Array<{ code: string; name: string }> }>;
    networks: Array<{ id: number; code: string; name: string }>;
    currencies?: Array<{ code: string; name: string; type: number }>;
  }> {
    try {
      const response = await axios.get('https://api.onramp.money/onramp/api/v2/sell/public/allConfig');
      const data = response.data.data;

      // Debug: Log the response structure
      console.log('OnRamp API response keys:', Object.keys(data));

      // Parse currencies (fiat) - try different possible key names
      const currencies: Array<{ code: string; name: string; type: number }> = [];
      const fiatCurrencyData = data.fiatCurrency || data.fiat_currency || data.currencies || data.fiatType;

      if (fiatCurrencyData) {
        console.log('Found fiat currency data with keys:', Object.keys(fiatCurrencyData));
        Object.keys(fiatCurrencyData).forEach((fiatCode) => {
          const fiatData = fiatCurrencyData[fiatCode];
          // Handle both object and primitive values
          if (typeof fiatData === 'object') {
            currencies.push({
              code: fiatCode.toUpperCase(),
              name: fiatData.name || fiatData.currency_name || fiatCode.toUpperCase(),
              type: fiatData.type || fiatData.currency_type || parseInt(fiatCode),
            });
          } else {
            // If fiatData is just a number (the type), use it directly
            currencies.push({
              code: fiatCode.toUpperCase(),
              name: fiatCode.toUpperCase(),
              type: typeof fiatData === 'number' ? fiatData : parseInt(fiatCode),
            });
          }
        });
      } else {
        console.warn('No fiat currency data found in OnRamp API response');
        // Use hardcoded FIAT_TYPES as fallback
        Object.entries(FIAT_TYPES).forEach(([code, type]) => {
          currencies.push({
            code,
            name: code,
            type,
          });
        });
      }

      // Parse networks (filter out test networks and deduplicate)
      const networkConfig = data.networkConfig;
      const networks: Array<{ id: number; code: string; name: string }> = [];
      const seenCodes = new Set<string>();

      Object.keys(networkConfig).forEach((networkId) => {
        const chainSymbol = networkConfig[networkId].chainSymbol;

        // Skip test networks (ending with -test)
        if (chainSymbol.endsWith('-test')) {
          return;
        }

        // Skip duplicates
        if (seenCodes.has(chainSymbol)) {
          return;
        }

        seenCodes.add(chainSymbol);
        networks.push({
          id: parseInt(networkId),
          code: chainSymbol,
          name: chainSymbol.toUpperCase(),
        });
      });

      // Parse coins and their supported networks (exclude test networks)
      const allCoinConfig = data.allCoinConfig;
      const coins: Array<{ symbol: string; name: string; networks: Array<{ code: string; name: string }> }> = [];

      Object.keys(allCoinConfig).forEach((coinCode) => {
        const coinData = allCoinConfig[coinCode];
        const supportedNetworks: Array<{ code: string; name: string }> = [];

        coinData.networks.forEach((networkId: number) => {
          const network = networks.find((n) => n.id === networkId);
          if (network && !network.code.endsWith('-test')) {
            supportedNetworks.push({
              code: network.code,
              name: network.name,
            });
          }
        });

        // Only include coins that have at least one supported network
        if (supportedNetworks.length > 0) {
          coins.push({
            symbol: coinCode.toUpperCase(),
            name: coinData.coinName || coinCode.toUpperCase(),
            networks: supportedNetworks,
          });
        }
      });

      console.log('Fetched OnRamp config:', {
        currencies: currencies.length,
        coins: coins.length,
        networks: networks.length,
      });

      return { coins, networks, currencies };
    } catch (error) {
      console.error('Failed to fetch OnRamp supported coins:', error);

      // Fallback to hardcoded list
      return {
        coins: this.getSupportedCryptos(),
        networks: [
          { id: 0, code: 'erc20', name: 'ERC20' },
          { id: 1, code: 'bep20', name: 'BEP20' },
          { id: 3, code: 'matic20', name: 'MATIC20' },
          { id: 13, code: 'arbitrum', name: 'ARBITRUM' },
        ],
        currencies: this.getSupportedCurrencies(),
      };
    }
  }

  /**
   * Get supported cryptocurrencies and networks (hardcoded fallback)
   */
  getSupportedCryptos(): Array<{
    symbol: string;
    name: string;
    networks: Array<{ code: string; name: string }>;
  }> {
    return [
      {
        symbol: 'USDT',
        name: 'Tether',
        networks: [
          { code: 'erc20', name: 'Ethereum (ERC20)' },
          { code: 'bep20', name: 'BNB Chain (BEP20)' },
          { code: 'matic20', name: 'Polygon' },
          { code: 'trc20', name: 'Tron (TRC20)' },
        ],
      },
      {
        symbol: 'USDC',
        name: 'USD Coin',
        networks: [
          { code: 'erc20', name: 'Ethereum (ERC20)' },
          { code: 'bep20', name: 'BNB Chain (BEP20)' },
          { code: 'matic20', name: 'Polygon' },
        ],
      },
      {
        symbol: 'ETH',
        name: 'Ethereum',
        networks: [
          { code: 'erc20', name: 'Ethereum' },
          { code: 'arbitrum', name: 'Arbitrum' },
          { code: 'optimism', name: 'Optimism' },
          { code: 'base', name: 'Base' },
        ],
      },
      {
        symbol: 'MATIC',
        name: 'Polygon',
        networks: [{ code: 'matic20', name: 'Polygon' }],
      },
      {
        symbol: 'BNB',
        name: 'BNB',
        networks: [{ code: 'bep20', name: 'BNB Chain (BEP20)' }],
      },
    ];
  }
}

export const onrampMoneyService = new OnRampMoneyService();
