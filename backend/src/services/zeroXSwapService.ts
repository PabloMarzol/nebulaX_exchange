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
   * Uses gasless-approval-tokens endpoint with static metadata (no RPC calls)
   */
  async getSupportedTokens(chainId: number): Promise<Array<{
    address: Address;
    symbol: string;
    name: string;
    decimals: number;
    logoURI?: string;
  }>> {
    // Known token metadata database - avoids rate limiting from RPC calls
    const TOKEN_METADATA: Record<string, { symbol: string; name: string; decimals: number }> = {
      // Common across chains
      '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2': { symbol: 'WETH', name: 'Wrapped Ether', decimals: 18 },
      '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48': { symbol: 'USDC', name: 'USD Coin', decimals: 6 },
      '0xdAC17F958D2ee523a2206206994597C13D831ec7': { symbol: 'USDT', name: 'Tether USD', decimals: 6 },
      '0x6B175474E89094C44Da98b954EedeAC495271d0F': { symbol: 'DAI', name: 'Dai Stablecoin', decimals: 18 },
      '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599': { symbol: 'WBTC', name: 'Wrapped BTC', decimals: 8 },
      // Polygon
      '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270': { symbol: 'WMATIC', name: 'Wrapped MATIC', decimals: 18 },
      '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174': { symbol: 'USDC', name: 'USD Coin (PoS)', decimals: 6 },
      '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359': { symbol: 'USDC', name: 'USD Coin', decimals: 6 },
      '0xc2132D05D31c914a87C6611C10748AEb04B58e8F': { symbol: 'USDT', name: 'Tether USD', decimals: 6 },
      '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063': { symbol: 'DAI', name: 'Dai Stablecoin', decimals: 18 },
      '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619': { symbol: 'WETH', name: 'Wrapped Ether', decimals: 18 },
      // Arbitrum
      '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1': { symbol: 'WETH', name: 'Wrapped Ether', decimals: 18 },
      '0xaf88d065e77c8cC2239327C5EDb3A432268e5831': { symbol: 'USDC', name: 'USD Coin', decimals: 6 },
      '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8': { symbol: 'USDC.e', name: 'Bridged USDC', decimals: 6 },
      '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9': { symbol: 'USDT', name: 'Tether USD', decimals: 6 },
      '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1': { symbol: 'DAI', name: 'Dai Stablecoin', decimals: 18 },
      '0x912CE59144191C1204E64559FE8253a0e49E6548': { symbol: 'ARB', name: 'Arbitrum', decimals: 18 },
      '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f': { symbol: 'WBTC', name: 'Wrapped BTC', decimals: 8 },
      // BSC
      '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c': { symbol: 'WBNB', name: 'Wrapped BNB', decimals: 18 },
      '0x55d398326f99059fF775485246999027B3197955': { symbol: 'USDT', name: 'Tether USD', decimals: 18 },
      '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d': { symbol: 'USDC', name: 'USD Coin', decimals: 18 },
      '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56': { symbol: 'BUSD', name: 'Binance USD', decimals: 18 },
      '0x1AF3F329e8BE154074D8769D1FFa4eE058B1DBc3': { symbol: 'DAI', name: 'Dai Stablecoin', decimals: 18 },
      // Base
      '0x4200000000000000000000000000000000000006': { symbol: 'WETH', name: 'Wrapped Ether', decimals: 18 },
      '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913': { symbol: 'USDC', name: 'USD Coin', decimals: 6 },
      '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb': { symbol: 'DAI', name: 'Dai Stablecoin', decimals: 18 },
      // Optimism
      '0x7F5c764cBc14f9669B88837ca1490cCa17c31607': { symbol: 'USDC', name: 'USD Coin (Bridged)', decimals: 6 },
      '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85': { symbol: 'USDC', name: 'USD Coin', decimals: 6 },
      '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58': { symbol: 'USDT', name: 'Tether USD', decimals: 6 },
      '0x4200000000000000000000000000000000000042': { symbol: 'OP', name: 'Optimism', decimals: 18 },
    };

    try {
      // Get tokens that support gasless approvals from 0x API
      const { tokens: gaslessTokens } = await this.getGaslessApprovalTokens(chainId);

      // Map gasless tokens to known metadata (no blockchain calls)
      const tokenMetadata = gaslessTokens
        .map((address) => {
          const metadata = TOKEN_METADATA[address] || TOKEN_METADATA[address.toLowerCase()];

          if (metadata) {
            return {
              address,
              ...metadata,
              logoURI: `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/${address}/logo.png`,
            };
          }

          // Skip unknown tokens to avoid clutter
          return null;
        })
        .filter((token): token is NonNullable<typeof token> => token !== null);

      return tokenMetadata;
    } catch (error) {
      console.error('Failed to fetch gasless tokens, using fallback list:', error);

      // Fallback to curated list if API fails
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
