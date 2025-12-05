import { db } from '../db/index.js';
import { onrampOrders } from '@shared/schema/swap.schema.js';
import { eq } from 'drizzle-orm';
import { env } from '../config/env.js';
import crypto from 'crypto';
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
  USD: 7,
  EUR: 8,
  GBP: 9,
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

export class OnRampMoneyService {
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
    const appId = env.ONRAMP_APP_ID || (env.NODE_ENV === 'production' ? '1' : '2');

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
      redirectURL: `${env.FRONTEND_URL || 'http://localhost:5173'}/swap?onramp=success&merchantId=${merchantRecognitionId}`,
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
   * Handle webhook callback from OnRamp Money
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

    // Find order by merchant recognition ID
    const [order] = await db
      .select()
      .from(onrampOrders)
      .where(eq(onrampOrders.merchantRecognitionId, merchantRecognitionId))
      .limit(1);

    if (!order) {
      throw new Error(`Order not found for merchantRecognitionId: ${merchantRecognitionId}`);
    }

    // Update order with callback data
    const updates: any = {
      updatedAt: new Date(),
    };

    if (orderId) {
      updates.providerOrderId = orderId;
    }

    if (status) {
      // Map OnRamp status to our status
      const statusMap: Record<string, string> = {
        success: 'completed',
        completed: 'completed',
        pending: 'processing',
        processing: 'processing',
        failed: 'failed',
        expired: 'failed',
      };
      updates.status = statusMap[status.toLowerCase()] || 'processing';

      if (updates.status === 'completed') {
        updates.completedAt = new Date();
      }
    }

    if (cryptoAmount) {
      updates.cryptoAmount = cryptoAmount;
    }

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

      // Parse currencies (fiat)
      const currencies: Array<{ code: string; name: string; type: number }> = [];
      if (data.fiatCurrency) {
        Object.keys(data.fiatCurrency).forEach((fiatCode) => {
          const fiatData = data.fiatCurrency[fiatCode];
          currencies.push({
            code: fiatCode.toUpperCase(),
            name: fiatData.name || fiatCode.toUpperCase(),
            type: fiatData.type || parseInt(fiatCode),
          });
        });
      }

      // Parse networks
      const networkConfig = data.networkConfig;
      const networks: Array<{ id: number; code: string; name: string }> = [];

      Object.keys(networkConfig).forEach((networkId) => {
        networks.push({
          id: parseInt(networkId),
          code: networkConfig[networkId].chainSymbol,
          name: networkConfig[networkId].chainSymbol.toUpperCase(),
        });
      });

      // Parse coins and their supported networks
      const allCoinConfig = data.allCoinConfig;
      const coins: Array<{ symbol: string; name: string; networks: Array<{ code: string; name: string }> }> = [];

      Object.keys(allCoinConfig).forEach((coinCode) => {
        const coinData = allCoinConfig[coinCode];
        const supportedNetworks: Array<{ code: string; name: string }> = [];

        coinData.networks.forEach((networkId: number) => {
          const network = networks.find((n) => n.id === networkId);
          if (network) {
            supportedNetworks.push({
              code: network.code,
              name: network.name,
            });
          }
        });

        coins.push({
          symbol: coinCode.toUpperCase(),
          name: coinData.coinName || coinCode.toUpperCase(),
          networks: supportedNetworks,
        });
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
