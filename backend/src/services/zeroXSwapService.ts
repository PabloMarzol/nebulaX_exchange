import { createPublicClient, http, type Address, parseUnits, formatUnits } from 'viem';
import { mainnet, polygon, arbitrum, bsc, base, optimism } from 'viem/chains';
import { env } from '../config/env.js';
import axios from 'axios';

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
      buyToken: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', // ETH placeholder
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
   * Now uses gasless-approval-tokens endpoint for accurate token list
   */
  async getSupportedTokens(chainId: number): Promise<Array<{
    address: Address;
    symbol: string;
    name: string;
    decimals: number;
    logoURI?: string;
  }>> {
    try {
      // Get tokens that support gasless approvals from 0x API
      const { tokens: gaslessTokens } = await this.getGaslessApprovalTokens(chainId);
      const publicClient = this.getPublicClient(chainId);

      // Fetch metadata for each token
      const tokenMetadata = await Promise.all(
        gaslessTokens.map(async (address) => {
          try {
            // Fetch token metadata using ERC20 ABI
            const [symbol, name, decimals] = await Promise.all([
              publicClient.readContract({
                address,
                abi: [{ name: 'symbol', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] }] as const,
                functionName: 'symbol',
              }),
              publicClient.readContract({
                address,
                abi: [{ name: 'name', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] }] as const,
                functionName: 'name',
              }),
              publicClient.readContract({
                address,
                abi: [{ name: 'decimals', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint8' }] }] as const,
                functionName: 'decimals',
              }),
            ]);

            return {
              address,
              symbol: symbol as string,
              name: name as string,
              decimals: decimals as number,
              // Use CoinGecko token images instead of 1inch
              logoURI: `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/${address}/logo.png`,
            };
          } catch (error) {
            // If metadata fetch fails, return basic info
            console.error(`Failed to fetch metadata for token ${address}:`, error);
            return {
              address,
              symbol: 'UNKNOWN',
              name: 'Unknown Token',
              decimals: 18,
            };
          }
        })
      );

      return tokenMetadata;
    } catch (error) {
      console.error('Failed to fetch gasless tokens, falling back to hardcoded list:', error);

      // Fallback to a minimal set of known tokens if API fails
      const fallbackTokens: Record<number, Array<{ address: Address; symbol: string; name: string; decimals: number }>> = {
        [mainnet.id]: [
          { address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', symbol: 'WETH', name: 'Wrapped Ether', decimals: 18 },
          { address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', symbol: 'USDC', name: 'USD Coin', decimals: 6 },
          { address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', symbol: 'USDT', name: 'Tether USD', decimals: 6 },
        ],
        [polygon.id]: [
          { address: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270', symbol: 'WMATIC', name: 'Wrapped MATIC', decimals: 18 },
          { address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', symbol: 'USDC', name: 'USD Coin', decimals: 6 },
        ],
        [arbitrum.id]: [
          { address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', symbol: 'WETH', name: 'Wrapped Ether', decimals: 18 },
          { address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', symbol: 'USDC', name: 'USD Coin', decimals: 6 },
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
