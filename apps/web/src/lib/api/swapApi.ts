import axios from 'axios';
import type { Address } from 'viem';
import { env } from '@/config/env';

const API_URL = env.apiUrl;

export interface SwapQuoteRequest {
  sellToken: Address;
  buyToken: Address;
  sellAmount?: string;
  buyAmount?: string;
  takerAddress: Address;
  slippagePercentage?: number;
  chainId: number;
}

export interface SwapQuote {
  price: string;
  guaranteedPrice: string;
  estimatedPriceImpact: string;
  to: Address;
  data: `0x${string}`;
  value: string;
  gas: string;
  estimatedGas: string;
  gasPrice: string;
  protocolFee: string;
  minimumProtocolFee: string;
  buyAmount: string;
  sellAmount: string;
  sources: Array<{ name: string; proportion: string }>;
  buyTokenAddress: Address;
  sellTokenAddress: Address;
  allowanceTarget: Address;
  sellTokenToEthRate: string;
  buyTokenToEthRate: string;
  expectedSlippage: string | null;
}

export interface PriceQuote {
  price: string;
  estimatedPriceImpact: string;
  buyAmount: string;
  sellAmount: string;
  gas: string;
  sources: Array<{ name: string; proportion: string }>;
}

export interface Token {
  address: Address;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
  supportsGasless?: boolean; // Flag to indicate gasless swap support
}

export interface TokenAllowance {
  token: Address;
  spender: Address;
  owner: Address;
  allowance: string;
  needsApproval: boolean;
}

export interface SwapOrder {
  id: string;
  sellToken: string;
  buyToken: string;
  sellAmount: string;
  buyAmount: string;
  sellTokenSymbol?: string;
  buyTokenSymbol?: string;
  chainId: number;
  price: string;
  status: 'pending' | 'submitted' | 'confirmed' | 'failed';
  txHash?: string;
  createdAt: string;
  updatedAt: string;
  confirmedAt?: string;
}

export interface OnRampOrder {
  id: string;
  userId: string;
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
  createdAt: string;
  updatedAt: string;
}

export interface Currency {
  code: string;
  name: string;
  type: number;
}

export interface CryptoWithNetworks {
  symbol: string;
  name: string;
  networks: Array<{ code: string; name: string }>;
}

// Missing interface - add this
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

// 0x Protocol Swap API
export const swapApi = {
  // Get swap quote
  async getQuote(params: SwapQuoteRequest, token?: string): Promise<SwapQuote> {
    const response = await axios.post<{ success: boolean; quote: SwapQuote }>(
      `${API_URL}/api/swap/quote`,
      params,
      {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      }
    );
    return response.data.quote;
  },

  // Get price quote (lighter)
  async getPrice(params: Omit<SwapQuoteRequest, 'takerAddress'>): Promise<PriceQuote> {
    const response = await axios.post<{ success: boolean; price: PriceQuote }>(
      `${API_URL}/api/swap/price`,
      params
    );
    return response.data.price;
  },

  // Record swap transaction
  async recordSwap(
    data: {
      sellToken: string;
      buyToken: string;
      sellAmount: string;
      buyAmount: string;
      sellTokenSymbol?: string;
      buyTokenSymbol?: string;
      chainId: number;
      price: string;
      guaranteedPrice?: string;
      slippage?: number;
      txHash?: string;
      status?: 'pending' | 'submitted' | 'confirmed' | 'failed';
    },
    token: string
  ): Promise<SwapOrder> {
    const response = await axios.post<{ success: boolean; order: SwapOrder }>(
      `${API_URL}/api/swap/record`,
      data,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return response.data.order;
  },

  // Update swap status
  async updateSwapStatus(
    orderId: string,
    data: {
      status: 'pending' | 'submitted' | 'confirmed' | 'failed';
      txHash?: string;
      error?: string;
    },
    token: string
  ): Promise<SwapOrder> {
    const response = await axios.patch<{ success: boolean; order: SwapOrder }>(
      `${API_URL}/api/swap/${orderId}/status`,
      data,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return response.data.order;
  },

  // Get supported tokens
  async getTokens(chainId: number): Promise<Token[]> {
    const response = await axios.get<{ success: boolean; tokens: Token[] }>(
      `${API_URL}/api/swap/tokens/${chainId}`
    );
    return response.data.tokens;
  },

  // Check token allowance
  async checkAllowance(
    params: {
      tokenAddress: Address;
      ownerAddress: Address;
      chainId: number;
    },
    token: string
  ): Promise<TokenAllowance> {
    const response = await axios.post<{ success: boolean; allowance: TokenAllowance }>(
      `${API_URL}/api/swap/allowance`,
      params,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return response.data.allowance;
  },

  // Get swap history
  async getHistory(limit: number = 10, token: string): Promise<SwapOrder[]> {
    const response = await axios.get<{ success: boolean; orders: SwapOrder[] }>(
      `${API_URL}/api/swap/history?limit=${limit}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return response.data.orders;
  },

  // ============================
  // GASLESS API v2 METHODS
  // ============================

  // Get indicative gasless price
  async getGaslessPrice(params: {
    chainId: number;
    sellToken: Address;
    buyToken: Address;
    sellAmount: string;
    taker?: Address;
    slippageBps?: number;
  }): Promise<any> {
    const response = await axios.post<{ success: boolean; priceQuote: any }>(
      `${API_URL}/api/swap/gasless/price`,
      params
    );
    return response.data.priceQuote;
  },

  // Get firm gasless quote with EIP-712 data
  async getGaslessQuote(
    params: {
      chainId: number;
      sellToken: Address;
      buyToken: Address;
      sellAmount: string;
      taker: Address;
      slippageBps?: number;
      swapFeeRecipient?: Address;
      swapFeeBps?: number;
      swapFeeToken?: Address;
    },
    token: string
  ): Promise<any> {
    const response = await axios.post<{ success: boolean; quote: any }>(
      `${API_URL}/api/swap/gasless/quote`,
      params,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return response.data.quote;
  },

  // Submit gasless swap with signatures
  async submitGaslessSwap(
    params: {
      chainId: number;
      approval?: {
        type: string;
        hash: string;
        eip712: any;
        signature: {
          v: number;
          r: string;
          s: string;
          signatureType: number;
        };
      };
      trade: {
        type: string;
        hash: string;
        eip712: any;
        signature: {
          v: number;
          r: string;
          s: string;
          signatureType: number;
        };
      };
    },
    token: string
  ): Promise<{
    tradeHash: string;
    type: string;
    zid: string;
  }> {
    const response = await axios.post<{
      success: boolean;
      result: {
        tradeHash: string;
        type: string;
        zid: string;
      };
    }>(`${API_URL}/api/swap/gasless/submit`, params, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data.result;
  },

  // Get gasless swap status
  async getGaslessStatus(
    params: {
      chainId: number;
      tradeHash: string;
    },
    token: string
  ): Promise<{
    status: 'pending' | 'submitted' | 'succeeded' | 'confirmed';
    transactions?: Array<{
      hash: string;
      timestamp: number;
    }>;
    approvalTransactions?: Array<{
      hash: string;
      timestamp: number;
    }>;
    zid: string;
  }> {
    const response = await axios.get<{
      success: boolean;
      status: any;
    }>(`${API_URL}/api/swap/gasless/status/${params.tradeHash}?chainId=${params.chainId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data.status;
  },

  // Get tokens that support gasless approvals
  async getGaslessApprovalTokens(chainId: number): Promise<{
    tokens: Address[];
    zid: string;
  }> {
    const response = await axios.get<{
      success: boolean;
      tokens: Address[];
      zid: string;
    }>(`${API_URL}/api/swap/gasless/approval-tokens/${chainId}`);
    return {
      tokens: response.data.tokens,
      zid: response.data.zid,
    };
  },

  // Get gasless supported chains
  async getGaslessChains(): Promise<{
    chains: Array<{
      chainId: string;
      chainName: string;
    }>;
    zid: string;
  }> {
    const response = await axios.get<{
      success: boolean;
      chains: Array<{
        chainId: string;
        chainName: string;
      }>;
      zid: string;
    }>(`${API_URL}/api/swap/gasless/chains`);
    return {
      chains: response.data.chains,
      zid: response.data.zid,
    };
  },
};

// OnRamp Money API
export const onrampApi = {
  // Create OnRamp order
  async createOrder(
    data: {
      fiatAmount: number;
      fiatCurrency: string;
      cryptoCurrency: string;
      network: string;
      walletAddress: string;
      paymentMethod: number;
      phoneNumber?: string;
      language?: string;
    },
    token?: string
  ): Promise<OnRampOrder> {
    const response = await axios.post<{ success: boolean; order: OnRampOrder }>(
      `${API_URL}/api/swap/onramp/create`,
      data,
      {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      }
    );
    return response.data.order;
  },

  // Get order by ID
  async getOrder(orderId: string, walletAddress?: string, token?: string): Promise<OnRampOrder> {
    const response = await axios.get<{ success: boolean; order: OnRampOrder }>(
      `${API_URL}/api/swap/onramp/order/${orderId}${walletAddress ? `?walletAddress=${walletAddress}` : ''}`,
      {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      }
    );
    return response.data.order;
  },

  // Get user's orders
  async getOrders(limit: number = 10, walletAddress?: string, token?: string): Promise<OnRampOrder[]> {
    const response = await axios.get<{ success: boolean; orders: OnRampOrder[] }>(
      `${API_URL}/api/swap/onramp/orders?limit=${limit}${walletAddress ? `&walletAddress=${walletAddress}` : ''}`,
      {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      }
    );
    return response.data.orders;
  },

  // Get supported currencies
  async getSupportedCurrencies(): Promise<Currency[]> {
    const response = await axios.get<{ success: boolean; currencies: Currency[] }>(
      `${API_URL}/api/swap/onramp/currencies`
    );
    return response.data.currencies;
  },

  // Get supported cryptos (hardcoded fallback)
  async getSupportedCryptos(): Promise<CryptoWithNetworks[]> {
    const response = await axios.get<{ success: boolean; cryptos: CryptoWithNetworks[] }>(
      `${API_URL}/api/swap/onramp/cryptos`
    );
    return response.data.cryptos;
  },

  // Fetch real supported coins, networks, and currencies from OnRamp.Money API
  async fetchSupportedCoinsAndNetworks(): Promise<{
    coins: Array<{ symbol: string; name: string; networks: Array<{ code: string; name: string }> }>;
    networks: Array<{ id: number; code: string; name: string }>;
    currencies?: Array<{ code: string; name: string; type: number }>;
  }> {
    const response = await axios.get<{
      success: boolean;
      coins: Array<{ symbol: string; name: string; networks: Array<{ code: string; name: string }> }>;
      networks: Array<{ id: number; code: string; name: string }>;
      currencies?: Array<{ code: string; name: string; type: number }>;
    }>(`${API_URL}/api/swap/onramp/supported`);
    return {
      coins: response.data.coins,
      networks: response.data.networks,
      currencies: response.data.currencies,
    };
  },

  // Get quote - ADDED THIS!
  async getQuote(
    params: {
      fiatAmount: number;
      fiatCurrency: string;
      cryptoCurrency: string;
      network: string;
    }
  ): Promise<OnRampQuote> {
    console.log('[swapApi] getQuote calling API with:', params);
    try {
      const response = await axios.post<{ success: boolean; quote: OnRampQuote }>(
        `${API_URL}/api/swap/onramp/quote`,
        params
      );
      console.log('[swapApi] getQuote success:', response.data);
      return response.data.quote;
    } catch (e) {
      console.error('[swapApi] getQuote failed:', e);
      throw e;
    }
  },
};
