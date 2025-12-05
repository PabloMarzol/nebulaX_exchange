import { createPublicClient, http, type Address, parseUnits, formatUnits } from 'viem';
import { mainnet, polygon, arbitrum, bsc, base, optimism } from 'viem/chains';
import { env } from '../config/env.js';
import axios from 'axios';
import { coingeckoService } from './coingeckoService.js';

const ZERO_X_API_BASE = 'https://api.0x.org';

// Chain mapping for 0x API
const CHAIN_CONFIG = {
  [mainnet.id]: {
    chain: mainnet,
    name: 'ethereum',
    apiUrl: `${ZERO_X_API_BASE}/swap/v1`,
    gaslessApiUrl: `${ZERO_X_API_BASE}/gasless`
  },
  [polygon.id]: {
    chain: polygon,
    name: 'polygon',
    apiUrl: `${ZERO_X_API_BASE}/swap/v1`,
    gaslessApiUrl: `${ZERO_X_API_BASE}/gasless`
  },
  [arbitrum.id]: {
    chain: arbitrum,
    name: 'arbitrum',
    apiUrl: `${ZERO_X_API_BASE}/swap/v1`,
    gaslessApiUrl: `${ZERO_X_API_BASE}/gasless`
  },
  [bsc.id]: {
    chain: bsc,
    name: 'bsc',
    apiUrl: `${ZERO_X_API_BASE}/swap/v1`,
    gaslessApiUrl: `${ZERO_X_API_BASE}/gasless`
  },
  [base.id]: {
    chain: base,
    name: 'base',
    apiUrl: `${ZERO_X_API_BASE}/swap/v1`,
    gaslessApiUrl: `${ZERO_X_API_BASE}/gasless`
  },
  [optimism.id]: {
    chain: optimism,
    name: 'optimism',
    apiUrl: `${ZERO_X_API_BASE}/swap/v1`,
    gaslessApiUrl: `${ZERO_X_API_BASE}/gasless`
  },
} as const;

export interface SwapQuoteParams {
  sellToken: Address;
  buyToken: Address;
  sellAmount?: string;
  buyAmount?: string;
  takerAddress: Address;
  slippagePercentage?: number;
  chainId: number;
  affiliateAddress?: Address;
  affiliateFee?: string; // Percentage as string (e.g., '0.01' for 1%)
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

export interface TokenAllowance {
  token: Address;
  spender: Address;
  owner: Address;
  allowance: string;
  needsApproval: boolean;
}

export class ZeroXSwapService {
  private getChainConfig(chainId: number) {
    const config = CHAIN_CONFIG[chainId as keyof typeof CHAIN_CONFIG];
    if (!config) {
      throw new Error(`Unsupported chain ID: ${chainId}. Supported chains: ${Object.keys(CHAIN_CONFIG).join(', ')}`);
    }
    return config;
  }

  private getPublicClient(chainId: number) {
    const { chain } = this.getChainConfig(chainId);
    return createPublicClient({
      chain,
      transport: http(),
    });
  }

  /**
   * Get a swap quote from 0x Protocol
   */
  async getSwapQuote(params: SwapQuoteParams): Promise<SwapQuote> {
    const { apiUrl } = this.getChainConfig(params.chainId);

    // Build query parameters
    const queryParams = new URLSearchParams({
      sellToken: params.sellToken,
      buyToken: params.buyToken,
      takerAddress: params.takerAddress,
      ...(params.sellAmount && { sellAmount: params.sellAmount }),
      ...(params.buyAmount && { buyAmount: params.buyAmount }),
      ...(params.slippagePercentage && { slippagePercentage: params.slippagePercentage.toString() }),
      ...(params.affiliateAddress && { feeRecipient: params.affiliateAddress }),
      ...(params.affiliateFee && { buyTokenPercentageFee: params.affiliateFee }),
      skipValidation: 'false',
      enableSlippageProtection: 'true',
    });

    try {
      const response = await axios.get(`${apiUrl}/quote?${queryParams}`, {
        headers: {
          '0x-api-key': env.ZERO_X_API_KEY || '',
          'Content-Type': 'application/json',
        },
      });

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.message || error.message;
        throw new Error(`0x API error: ${message}`);
      }
      throw error;
    }
  }

  /**
   * Get a price quote (lighter version without full swap data)
   */
  async getPriceQuote(params: Omit<SwapQuoteParams, 'takerAddress'>): Promise<{
    price: string;
    estimatedPriceImpact: string;
    buyAmount: string;
    sellAmount: string;
    gas: string;
    sources: Array<{ name: string; proportion: string }>;
  }> {
    const { apiUrl } = this.getChainConfig(params.chainId);

    const queryParams = new URLSearchParams({
      sellToken: params.sellToken,
      buyToken: params.buyToken,
      ...(params.sellAmount && { sellAmount: params.sellAmount }),
      ...(params.buyAmount && { buyAmount: params.buyAmount }),
    });

    try {
      const response = await axios.get(`${apiUrl}/price?${queryParams}`, {
        headers: {
          '0x-api-key': env.ZERO_X_API_KEY || '',
        },
      });

      return {
        price: response.data.price,
        estimatedPriceImpact: response.data.estimatedPriceImpact,
        buyAmount: response.data.buyAmount,
        sellAmount: response.data.sellAmount,
        gas: response.data.gas,
        sources: response.data.sources,
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.message || error.message;
        throw new Error(`0x API error: ${message}`);
      }
      throw error;
    }
  }

  /**
   * Check token allowance for 0x Protocol
   */
  async checkAllowance(
    tokenAddress: Address,
    ownerAddress: Address,
    chainId: number
  ): Promise<TokenAllowance> {
    const publicClient = this.getPublicClient(chainId);

    // Get the 0x exchange proxy address for this chain
    const quote = await this.getSwapQuote({
      sellToken: tokenAddress,
      buyToken: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee', // ETH placeholder
      sellAmount: '1',
      takerAddress: ownerAddress,
      chainId,
    });

    const spenderAddress = quote.allowanceTarget;

    // Check allowance using ERC20 ABI
    const allowance = await publicClient.readContract({
      address: tokenAddress,
      abi: [
        {
          name: 'allowance',
          type: 'function',
          stateMutability: 'view',
          inputs: [
            { name: 'owner', type: 'address' },
            { name: 'spender', type: 'address' },
          ],
          outputs: [{ name: '', type: 'uint256' }],
        },
      ] as const,
      functionName: 'allowance',
      args: [ownerAddress, spenderAddress],
    });

    const allowanceString = allowance.toString();

    return {
      token: tokenAddress,
      spender: spenderAddress,
      owner: ownerAddress,
      allowance: allowanceString,
      needsApproval: BigInt(allowanceString) === 0n,
    };
  }

  /**
   * Get supported tokens for a chain
   * Uses gasless-approval-tokens endpoint with CoinGecko metadata (fallback to static)
   */
  async getSupportedTokens(chainId: number): Promise<Array<{
    address: Address;
    symbol: string;
    name: string;
    decimals: number;
    logoURI?: string;
  }>> {
    // Static fallback metadata - used when CoinGecko fails or rate limits
    const TOKEN_METADATA: Record<string, { symbol: string; name: string; decimals: number }> = {
      // Ethereum Mainnet
      '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2': { symbol: 'WETH', name: 'Wrapped Ether', decimals: 18 },
      '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': { symbol: 'USDC', name: 'USD Coin', decimals: 6 },
      '0xdac17f958d2ee523a2206206994597c13d831ec7': { symbol: 'USDT', name: 'Tether USD', decimals: 6 },
      '0x6b175474e89094c44da98b954eedeac495271d0f': { symbol: 'DAI', name: 'Dai Stablecoin', decimals: 18 },
      '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599': { symbol: 'WBTC', name: 'Wrapped BTC', decimals: 8 },
      '0x8457ca5040ad67fdebbcc8edce889a335bc0fbfb': { symbol: 'SALT', name: 'SALT', decimals: 8 },
      // Polygon
      '0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270': { symbol: 'WMATIC', name: 'Wrapped MATIC', decimals: 18 },
      '0x2791bca1f2de4661ed88a30c99a7a9449aa84174': { symbol: 'USDC', name: 'USD Coin (PoS)', decimals: 6 },
      '0x3c499c542cef5e3811e1192ce70d8cc03d5c3359': { symbol: 'USDC', name: 'USD Coin', decimals: 6 },
      '0xc2132d05d31c914a87c6611c10748aeb04b58e8f': { symbol: 'USDT', name: 'Tether USD', decimals: 6 },
      '0x8f3cf7ad23cd3cadbd9735aff958023239c6a063': { symbol: 'DAI', name: 'Dai Stablecoin', decimals: 18 },
      '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619': { symbol: 'WETH', name: 'Wrapped Ether', decimals: 18 },
      // Arbitrum
      '0x82af49447d8a07e3bd95bd0d56f35241523fbab1': { symbol: 'WETH', name: 'Wrapped Ether', decimals: 18 },
      '0xaf88d065e77c8cc2239327c5edb3a432268e5831': { symbol: 'USDC', name: 'USD Coin', decimals: 6 },
      '0xff970a61a04b1ca14834a43f5de4533ebddb5cc8': { symbol: 'USDC.e', name: 'Bridged USDC', decimals: 6 },
      '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9': { symbol: 'USDT', name: 'Tether USD', decimals: 6 },
      '0xda10009cbd5d07dd0cecc66161fc93d7c9000da1': { symbol: 'DAI', name: 'Dai Stablecoin', decimals: 18 },
      '0x912ce59144191c1204e64559fe8253a0e49e6548': { symbol: 'ARB', name: 'Arbitrum', decimals: 18 },
      '0x2f2a2543b76a4166549f7aab2e75bef0aefc5b0f': { symbol: 'WBTC', name: 'Wrapped BTC', decimals: 8 },
      '0xc5102fe9359fd9a28f877a67e36b0f050d81a3cc': { symbol: 'HONEY', name: 'Honey', decimals: 18 },
      '0x079504b86d38119f859c4194765029f692b7b7aa': { symbol: 'BORING', name: 'BoringDAO', decimals: 18 },
      // BSC
      '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c': { symbol: 'WBNB', name: 'Wrapped BNB', decimals: 18 },
      '0x55d398326f99059ff775485246999027b3197955': { symbol: 'USDT', name: 'Tether USD', decimals: 18 },
      '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d': { symbol: 'USDC', name: 'USD Coin', decimals: 18 },
      '0xe9e7cea3dedca5984780bafc599bd69add087d56': { symbol: 'BUSD', name: 'Binance USD', decimals: 18 },
      '0x1af3f329e8be154074d8769d1ffa4ee058b1dbc3': { symbol: 'DAI', name: 'Dai Stablecoin', decimals: 18 },
      // Base
      '0x4200000000000000000000000000000000000006': { symbol: 'WETH', name: 'Wrapped Ether', decimals: 18 },
      '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913': { symbol: 'USDC', name: 'USD Coin', decimals: 6 },
      '0x50c5725949a6f0c72e6c4a641f24049a917db0cb': { symbol: 'DAI', name: 'Dai Stablecoin', decimals: 18 },
      // Optimism
      '0x7f5c764cbc14f9669b88837ca1490cca17c31607': { symbol: 'USDC', name: 'USD Coin (Bridged)', decimals: 6 },
      '0x0b2c639c533813f4aa9d7837caf62653d097ff85': { symbol: 'USDC', name: 'USD Coin', decimals: 6 },
      '0x94b008aa00579c1307b0ef2c499ad98a8ce58e58': { symbol: 'USDT', name: 'Tether USD', decimals: 6 },
      '0x4200000000000000000000000000000000000042': { symbol: 'OP', name: 'Optimism', decimals: 18 },
    };

    try {
      // Get tokens that support gasless approvals from 0x API
      const { tokens: gaslessTokens } = await this.getGaslessApprovalTokens(chainId);

      // Map tokens with three-tier fallback: CoinGecko -> Static -> Address-based
      const tokenMetadataPromises = gaslessTokens.map(async (address) => {
        const normalizedAddress = address.toLowerCase();

        // Tier 1: Try CoinGecko API first (best quality - real images and data)
        try {
          const coingeckoData = await coingeckoService.getTokenMetadata(address, chainId);
          if (coingeckoData) {
            return coingeckoData;
          }
        } catch (error) {
          // CoinGecko failed, fall through to static metadata
        }

        // Tier 2: Fall back to static metadata (good quality - known tokens)
        const staticMetadata = TOKEN_METADATA[normalizedAddress];
        if (staticMetadata) {
          return {
            address,
            ...staticMetadata,
            logoURI: `https://ui-avatars.com/api/?name=${encodeURIComponent(staticMetadata.symbol)}&size=128&background=random`,
          };
        }

        // Tier 3: Final fallback - address-based metadata (ensures ALL tokens appear)
        const shortAddr = address.slice(2, 8).toUpperCase();
        return {
          address,
          symbol: shortAddr,
          name: `Token ${shortAddr}`,
          decimals: 18,
          logoURI: `https://ui-avatars.com/api/?name=${shortAddr}&size=128&background=gray`,
        };
      });

      const tokenMetadata = await Promise.all(tokenMetadataPromises);

      if (process.env.NODE_ENV === 'development') {
        const coingeckoCount = tokenMetadata.filter(t => t.logoURI && !t.logoURI.includes('ui-avatars')).length;
        const staticCount = tokenMetadata.filter(t => t.logoURI?.includes('background=random')).length;
        const unknownCount = tokenMetadata.filter(t => t.name.startsWith('Token ')).length;
        console.log(`Loaded ${tokenMetadata.length} tokens for chain ${chainId}: ${coingeckoCount} from CoinGecko, ${staticCount} from static, ${unknownCount} unknown`);
      }

      return tokenMetadata;
    } catch (error) {
      console.error('Failed to fetch gasless tokens, using fallback list:', error);

      // Fallback to curated list if API fails
      const fallbackTokens: Record<number, Array<{ address: Address; symbol: string; name: string; decimals: number }>> = {
        [mainnet.id]: [
          { address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', symbol: 'WETH', name: 'Wrapped Ether', decimals: 18 },
          { address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', symbol: 'USDC', name: 'USD Coin', decimals: 6 },
          { address: '0xdac17f958d2ee523a2206206994597c13d831ec7', symbol: 'USDT', name: 'Tether USD', decimals: 6 },
        ],
        [polygon.id]: [
          { address: '0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270', symbol: 'WMATIC', name: 'Wrapped MATIC', decimals: 18 },
          { address: '0x2791bca1f2de4661ed88a30c99a7a9449aa84174', symbol: 'USDC', name: 'USD Coin', decimals: 6 },
        ],
        [arbitrum.id]: [
          { address: '0x82af49447d8a07e3bd95bd0d56f35241523fbab1', symbol: 'WETH', name: 'Wrapped Ether', decimals: 18 },
          { address: '0xaf88d065e77c8cc2239327c5edb3a432268e5831', symbol: 'USDC', name: 'USD Coin', decimals: 6 },
        ],
      };

      return fallbackTokens[chainId] || fallbackTokens[mainnet.id];
    }
  }

  /**
   * Calculate minimum output amount based on slippage
   */
  calculateMinimumOutput(buyAmount: string, slippagePercentage: number): string {
    const amount = BigInt(buyAmount);
    const slippage = BigInt(Math.floor(slippagePercentage * 10000)); // Convert to basis points
    const minAmount = (amount * (10000n - slippage)) / 10000n;
    return minAmount.toString();
  }

  // ============================
  // GASLESS API v2 METHODS
  // ============================

  /**
   * Get an indicative price for a gasless swap
   * This is a read-only version that doesn't require a full quote
   */
  async getGaslessPrice(params: {
    chainId: number;
    sellToken: Address;
    buyToken: Address;
    sellAmount: string;
    taker?: Address;
    slippageBps?: number;
  }): Promise<any> {
    const { gaslessApiUrl } = this.getChainConfig(params.chainId);

    const queryParams = new URLSearchParams({
      chainId: params.chainId.toString(),
      sellToken: params.sellToken,
      buyToken: params.buyToken,
      sellAmount: params.sellAmount,
      ...(params.taker && { taker: params.taker }),
      ...(params.slippageBps && { slippageBps: params.slippageBps.toString() }),
    });

    try {
      const response = await axios.get(`${gaslessApiUrl}/price?${queryParams}`, {
        headers: {
          '0x-api-key': env.ZERO_X_API_KEY || '',
          '0x-version': 'v2',
        },
      });

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.message || error.message;
        throw new Error(`0x Gasless API error: ${message}`);
      }
      throw error;
    }
  }

  /**
   * Get a firm quote for a gasless swap
   * Returns EIP-712 typed data for signing
   */
  async getGaslessQuote(params: {
    chainId: number;
    sellToken: Address;
    buyToken: Address;
    sellAmount: string;
    taker: Address;
    slippageBps?: number;
    swapFeeRecipient?: Address;
    swapFeeBps?: number;
    swapFeeToken?: Address;
  }): Promise<any> {
    const { gaslessApiUrl } = this.getChainConfig(params.chainId);

    const queryParams = new URLSearchParams({
      chainId: params.chainId.toString(),
      sellToken: params.sellToken,
      buyToken: params.buyToken,
      sellAmount: params.sellAmount,
      taker: params.taker,
      ...(params.slippageBps && { slippageBps: params.slippageBps.toString() }),
      ...(params.swapFeeRecipient && { swapFeeRecipient: params.swapFeeRecipient }),
      ...(params.swapFeeBps && { swapFeeBps: params.swapFeeBps.toString() }),
      ...(params.swapFeeToken && { swapFeeToken: params.swapFeeToken }),
    });

    try {
      const response = await axios.get(`${gaslessApiUrl}/quote?${queryParams}`, {
        headers: {
          '0x-api-key': env.ZERO_X_API_KEY || '',
          '0x-version': 'v2',
        },
      });

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.message || error.message;
        throw new Error(`0x Gasless API error: ${message}`);
      }
      throw error;
    }
  }

  /**
   * Submit a gasless swap with signatures
   * This is called after the user signs the approval and trade EIP-712 data
   */
  async submitGaslessSwap(params: {
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
  }): Promise<{
    tradeHash: string;
    type: string;
    zid: string;
  }> {
    const { gaslessApiUrl } = this.getChainConfig(params.chainId);

    try {
      const response = await axios.post(
        `${gaslessApiUrl}/submit`,
        {
          chainId: params.chainId,
          ...(params.approval && { approval: params.approval }),
          trade: params.trade,
        },
        {
          headers: {
            '0x-api-key': env.ZERO_X_API_KEY || '',
            '0x-version': 'v2',
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.message || error.message;
        throw new Error(`0x Gasless API error: ${message}`);
      }
      throw error;
    }
  }

  /**
   * Get the status of a gasless swap
   */
  async getGaslessStatus(params: {
    chainId: number;
    tradeHash: string;
  }): Promise<{
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
    const { gaslessApiUrl } = this.getChainConfig(params.chainId);

    try {
      const response = await axios.get(
        `${gaslessApiUrl}/status/${params.tradeHash}?chainId=${params.chainId}`,
        {
          headers: {
            '0x-api-key': env.ZERO_X_API_KEY || '',
            '0x-version': 'v2',
          },
        }
      );

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.message || error.message;
        throw new Error(`0x Gasless API error: ${message}`);
      }
      throw error;
    }
  }

  /**
   * Get tokens that support gasless approvals for a specific chain
   */
  async getGaslessApprovalTokens(chainId: number): Promise<{
    tokens: Address[];
    zid: string;
  }> {
    const { gaslessApiUrl } = this.getChainConfig(chainId);

    try {
      const response = await axios.get(`${gaslessApiUrl}/gasless-approval-tokens?chainId=${chainId}`, {
        headers: {
          '0x-api-key': env.ZERO_X_API_KEY || '',
          '0x-version': 'v2',
        },
      });

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.message || error.message;
        throw new Error(`0x Gasless API error: ${message}`);
      }
      throw error;
    }
  }

  /**
   * Get list of supported chains for gasless swaps
   */
  async getGaslessChains(): Promise<{
    chains: Array<{
      chainId: string;
      chainName: string;
    }>;
    zid: string;
  }> {
    try {
      const response = await axios.get(`${ZERO_X_API_BASE}/gasless/chains`, {
        headers: {
          '0x-api-key': env.ZERO_X_API_KEY || '',
          '0x-version': 'v2',
        },
      });

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.message || error.message;
        throw new Error(`0x Gasless API error: ${message}`);
      }
      throw error;
    }
  }
}

export const zeroXSwapService = new ZeroXSwapService();
