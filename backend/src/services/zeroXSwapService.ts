import { createPublicClient, http, type Address, parseUnits, formatUnits } from 'viem';
import { mainnet, polygon, arbitrum, bsc, base, optimism } from 'viem/chains';
import { env } from '../config/env.js';
import axios from 'axios';

const ZERO_X_API_BASE = 'https://api.0x.org';

// Chain mapping for 0x API
const CHAIN_CONFIG = {
  [mainnet.id]: { chain: mainnet, name: 'ethereum', apiUrl: `${ZERO_X_API_BASE}/swap/v1` },
  [polygon.id]: { chain: polygon, name: 'polygon', apiUrl: `${ZERO_X_API_BASE}/swap/v1` },
  [arbitrum.id]: { chain: arbitrum, name: 'arbitrum', apiUrl: `${ZERO_X_API_BASE}/swap/v1` },
  [bsc.id]: { chain: bsc, name: 'bsc', apiUrl: `${ZERO_X_API_BASE}/swap/v1` },
  [base.id]: { chain: base, name: 'base', apiUrl: `${ZERO_X_API_BASE}/swap/v1` },
  [optimism.id]: { chain: optimism, name: 'optimism', apiUrl: `${ZERO_X_API_BASE}/swap/v1` },
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
   */
  async getSupportedTokens(chainId: number): Promise<Array<{
    address: Address;
    symbol: string;
    name: string;
    decimals: number;
    logoURI?: string;
  }>> {
    const { chain } = this.getChainConfig(chainId);

    // Common tokens across chains
    const commonTokens = {
      WETH: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      DAI: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
      WBTC: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
    };

    // Chain-specific token addresses
    const tokensByChain: Record<number, Record<string, Address>> = {
      [polygon.id]: {
        WMATIC: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270' as Address,
        USDC: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174' as Address,
        USDT: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F' as Address,
        DAI: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063' as Address,
        WETH: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619' as Address,
      },
      [arbitrum.id]: {
        WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1' as Address,
        USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831' as Address,
        USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9' as Address,
        DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1' as Address,
        ARB: '0x912CE59144191C1204E64559FE8253a0e49E6548' as Address,
      },
      [bsc.id]: {
        WBNB: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c' as Address,
        USDT: '0x55d398326f99059fF775485246999027B3197955' as Address,
        USDC: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d' as Address,
        BUSD: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56' as Address,
        DAI: '0x1AF3F329e8BE154074D8769D1FFa4eE058B1DBc3' as Address,
      },
      [base.id]: {
        WETH: '0x4200000000000000000000000000000000000006' as Address,
        USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as Address,
        DAI: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb' as Address,
      },
      [optimism.id]: {
        WETH: '0x4200000000000000000000000000000000000006' as Address,
        USDC: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607' as Address,
        USDT: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58' as Address,
        DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1' as Address,
        OP: '0x4200000000000000000000000000000000000042' as Address,
      },
    };

    const tokens = tokensByChain[chainId] || commonTokens;

    return Object.entries(tokens).map(([symbol, address]) => ({
      address,
      symbol,
      name: symbol,
      decimals: symbol.includes('USDC') || symbol.includes('USDT') ? 6 : 18,
      logoURI: `https://tokens.1inch.io/${address}.png`,
    }));
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
}

export const zeroXSwapService = new ZeroXSwapService();
