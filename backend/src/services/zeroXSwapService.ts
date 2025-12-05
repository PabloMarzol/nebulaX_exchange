import { createPublicClient, http, type Address, parseUnits, formatUnits } from 'viem';
import { mainnet, polygon, arbitrum, bsc, base, optimism } from 'viem/chains';
import { env } from '../config/env.js';
import axios from 'axios';
import { coingeckoService } from './coingeckoService.js';

const ZERO_X_API_BASE = 'https://api.0x.org';

// Native token special address recognized by 0x Protocol
const NATIVE_TOKEN_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' as Address;

// Native tokens per chain (these don't need approval, so supportsGasless = false)
const NATIVE_TOKENS: Record<number, {
  address: Address;
  symbol: string;
  name: string;
  decimals: number;
  logoURI: string;
  supportsGasless: boolean;
}> = {
  [mainnet.id]: {
    address: NATIVE_TOKEN_ADDRESS,
    symbol: 'ETH',
    name: 'Ethereum',
    decimals: 18,
    logoURI: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
    supportsGasless: false,
  },
  [polygon.id]: {
    address: NATIVE_TOKEN_ADDRESS,
    symbol: 'MATIC',
    name: 'Polygon',
    decimals: 18,
    logoURI: 'https://assets.coingecko.com/coins/images/4713/small/matic-token-icon.png',
    supportsGasless: false,
  },
  [arbitrum.id]: {
    address: NATIVE_TOKEN_ADDRESS,
    symbol: 'ETH',
    name: 'Ethereum',
    decimals: 18,
    logoURI: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
    supportsGasless: false,
  },
  [bsc.id]: {
    address: NATIVE_TOKEN_ADDRESS,
    symbol: 'BNB',
    name: 'BNB',
    decimals: 18,
    logoURI: 'https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png',
    supportsGasless: false,
  },
  [base.id]: {
    address: NATIVE_TOKEN_ADDRESS,
    symbol: 'ETH',
    name: 'Ethereum',
    decimals: 18,
    logoURI: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
    supportsGasless: false,
  },
  [optimism.id]: {
    address: NATIVE_TOKEN_ADDRESS,
    symbol: 'ETH',
    name: 'Ethereum',
    decimals: 18,
    logoURI: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
    supportsGasless: false,
  },
};

// Gasless tokens cache with 5-minute TTL
const gaslessTokensCache = new Map<number, { tokens: Address[]; timestamp: number }>();
const GASLESS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Token list cache with 24-hour TTL
interface TokenListEntry {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
}
const tokenListCache = new Map<number, { tokens: TokenListEntry[]; timestamp: number }>();
const TOKEN_LIST_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

// Standard token list URLs per chain
const TOKEN_LIST_URLS: Record<number, string> = {
  1: 'https://tokens.coingecko.com/uniswap/all.json',
  137: 'https://api-polygon-tokens.polygon.technology/tokenlists/default.tokenlist.json',
  42161: 'https://tokenlist.arbitrum.io/ArbTokenLists/arbed_arb_whitelist_era.json',
  10: 'https://static.optimism.io/optimism.tokenlist.json',
  8453: 'https://tokens.coingecko.com/base/all.json',
  56: 'https://tokens.pancakeswap.finance/pancakeswap-extended.json',
};

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
   * Fetch gasless approval tokens with caching (5-minute TTL)
   */
  private async fetchGaslessTokensCached(chainId: number): Promise<Address[]> {
    // Check cache first
    const cached = gaslessTokensCache.get(chainId);
    if (cached && Date.now() - cached.timestamp < GASLESS_CACHE_TTL) {
      return cached.tokens;
    }

    // Fetch from API
    try {
      const { tokens } = await this.getGaslessApprovalTokens(chainId);

      // Cache result
      gaslessTokensCache.set(chainId, { tokens, timestamp: Date.now() });

      return tokens;
    } catch (error) {
      // Return cached value even if expired, or empty array
      return cached?.tokens || [];
    }
  }

  /**
   * Fetch token list from standard sources with caching (24-hour TTL)
   */
  private async fetchTokenListCached(chainId: number): Promise<TokenListEntry[]> {
    // Check cache first
    const cached = tokenListCache.get(chainId);
    if (cached && Date.now() - cached.timestamp < TOKEN_LIST_CACHE_TTL) {
      return cached.tokens;
    }

    const tokenListUrl = TOKEN_LIST_URLS[chainId];
    if (!tokenListUrl) {
      return [];
    }

    try {
      const response = await axios.get(tokenListUrl, {
        timeout: 8000,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'NebulaX-Exchange/1.0'
        }
      });

      const data = response.data;
      let tokenArray = data.tokens || data;

      if (!Array.isArray(tokenArray)) {
        console.warn(`Invalid token list format for chain ${chainId}`);
        return cached?.tokens || [];
      }

      // Filter for this chain and map to our format
      const tokens: TokenListEntry[] = tokenArray
        .filter((token: any) => {
          const tokenChainId = token.chainId || token.chain || chainId;
          return tokenChainId === chainId;
        })
        .map((token: any) => ({
          address: token.address.toLowerCase(),
          symbol: token.symbol,
          name: token.name,
          decimals: token.decimals,
          logoURI: token.logoURI || token.logoUri || token.icon,
        }));

      // Cache result
      tokenListCache.set(chainId, { tokens, timestamp: Date.now() });

      console.log(`Fetched and cached ${tokens.length} tokens from token list for chain ${chainId}`);

      return tokens;
    } catch (error) {
      console.warn(`Failed to fetch token list for chain ${chainId}:`, error);
      // Return cached value even if expired, or empty array
      return cached?.tokens || [];
    }
  }

  /**
   * Get supported tokens for a chain
   * Uses gasless-approval-tokens endpoint with token list metadata and gasless flag
   */
  async getSupportedTokens(chainId: number): Promise<Array<{
    address: Address;
    symbol: string;
    name: string;
    decimals: number;
    logoURI?: string;
    supportsGasless?: boolean;
  }>> {
    // Static metadata - primary source for known tokens
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
      // Get gasless tokens (cached - 5min TTL)
      const gaslessTokens = await this.fetchGaslessTokensCached(chainId);

      // Get token list from standard sources (cached - 24hr TTL)
      const tokenList = await this.fetchTokenListCached(chainId);

      // Create a map for quick token list lookups
      const tokenListMap = new Map(
        tokenList.map(token => [token.address.toLowerCase(), token])
      );

      // Map gasless tokens with three-tier fallback: Token List -> Static -> Address-based
      const tokenMetadata = gaslessTokens.map((address) => {
        const normalizedAddress = address.toLowerCase();

        // Tier 1: Token list metadata (best - real logos and verified info)
        const tokenListEntry = tokenListMap.get(normalizedAddress);
        if (tokenListEntry) {
          return {
            address,
            symbol: tokenListEntry.symbol,
            name: tokenListEntry.name,
            decimals: tokenListEntry.decimals,
            logoURI: tokenListEntry.logoURI || `https://ui-avatars.com/api/?name=${encodeURIComponent(tokenListEntry.symbol)}&size=128&background=random`,
            supportsGasless: true,
          };
        }

        // Tier 2: Static metadata (good - known tokens)
        const staticMetadata = TOKEN_METADATA[normalizedAddress];
        if (staticMetadata) {
          return {
            address,
            ...staticMetadata,
            logoURI: `https://ui-avatars.com/api/?name=${encodeURIComponent(staticMetadata.symbol)}&size=128&background=random`,
            supportsGasless: true,
          };
        }

        // Tier 3: Address-based metadata (ensures ALL tokens appear)
        const shortAddr = address.slice(2, 8).toUpperCase();
        return {
          address,
          symbol: shortAddr,
          name: `Token ${shortAddr}`,
          decimals: 18,
          logoURI: `https://ui-avatars.com/api/?name=${shortAddr}&size=128&background=gray`,
          supportsGasless: true,
        };
      });

      if (process.env.NODE_ENV === 'development') {
        const tokenListCount = tokenMetadata.filter(t => tokenListMap.has(t.address.toLowerCase())).length;
        const staticCount = tokenMetadata.filter(t => !tokenListMap.has(t.address.toLowerCase()) && !t.name.startsWith('Token ')).length;
        const unknownCount = tokenMetadata.filter(t => t.name.startsWith('Token ')).length;
        console.log(`Loaded ${tokenMetadata.length} gasless tokens for chain ${chainId}: ${tokenListCount} from token list, ${staticCount} from static, ${unknownCount} unknown`);
      }

      // Prepend native token for this chain if it exists
      const nativeToken = NATIVE_TOKENS[chainId];
      if (nativeToken) {
        return [nativeToken, ...tokenMetadata];
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

      const fallbackList = fallbackTokens[chainId] || fallbackTokens[mainnet.id];

      // Prepend native token for fallback as well
      const nativeToken = NATIVE_TOKENS[chainId];
      if (nativeToken) {
        return [nativeToken, ...fallbackList];
      }

      return fallbackList;
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
