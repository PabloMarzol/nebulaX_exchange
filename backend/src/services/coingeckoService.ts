import axios from 'axios';
import { env } from '../config/env.js';
import type { Address } from 'viem';

const COINGECKO_API_BASE = 'https://api.coingecko.com/api/v3';
const COINGECKO_PRO_API_BASE = 'https://pro-api.coingecko.com/api/v3';

// Chain ID to CoinGecko platform mapping
const CHAIN_TO_PLATFORM: Record<number, string> = {
  1: 'ethereum',
  137: 'polygon-pos',
  42161: 'arbitrum-one',
  56: 'binance-smart-chain',
  8453: 'base',
  10: 'optimistic-ethereum',
};

interface TokenMetadata {
  address: Address;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
}

// In-memory cache to avoid hitting API limits
const tokenCache = new Map<string, { data: TokenMetadata; timestamp: number }>();
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour

export class CoinGeckoService {
  private apiKey: string | undefined;
  private baseUrl: string;

  constructor() {
    this.apiKey = env.COINGECKO_API_KEY;
    this.baseUrl = this.apiKey ? COINGECKO_PRO_API_BASE : COINGECKO_API_BASE;
  }

  /**
   * Get token metadata by contract address
   */
  async getTokenMetadata(address: Address, chainId: number): Promise<TokenMetadata | null> {
    const cacheKey = `${chainId}:${address.toLowerCase()}`;

    // Check cache first
    const cached = tokenCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }

    try {
      const platform = CHAIN_TO_PLATFORM[chainId];
      if (!platform) {
        console.debug(`No CoinGecko platform mapping for chain ${chainId}`);
        return null;
      }

      const headers = this.apiKey
        ? { 'x-cg-pro-api-key': this.apiKey }
        : {};

      const response = await axios.get(
        `${this.baseUrl}/coins/${platform}/contract/${address.toLowerCase()}`,
        {
          headers,
          timeout: 5000,
        }
      );

      const data = response.data;

      const metadata: TokenMetadata = {
        address,
        symbol: data.symbol?.toUpperCase() || 'UNKNOWN',
        name: data.name || 'Unknown Token',
        decimals: data.detail_platforms?.[platform]?.decimal_place || 18,
        logoURI: data.image?.small || data.image?.thumb,
      };

      // Cache the result
      tokenCache.set(cacheKey, { data: metadata, timestamp: Date.now() });

      return metadata;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          console.debug(`Token not found on CoinGecko: ${address} on chain ${chainId}`);
        } else if (error.response?.status === 429) {
          console.warn('CoinGecko API rate limit reached');
        } else {
          console.debug(`CoinGecko API error for ${address}:`, error.message);
        }
      }
      return null;
    }
  }

  /**
   * Get metadata for multiple tokens (batch with rate limiting)
   */
  async getTokensMetadata(
    addresses: Address[],
    chainId: number
  ): Promise<Map<string, TokenMetadata>> {
    const results = new Map<string, TokenMetadata>();

    // Process in chunks to avoid rate limits
    const chunkSize = 10;
    for (let i = 0; i < addresses.length; i += chunkSize) {
      const chunk = addresses.slice(i, i + chunkSize);

      const promises = chunk.map(async (address) => {
        const metadata = await this.getTokenMetadata(address, chainId);
        if (metadata) {
          results.set(address.toLowerCase(), metadata);
        }
      });

      await Promise.all(promises);

      // Rate limiting: wait 1 second between chunks
      if (i + chunkSize < addresses.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return results;
  }

  /**
   * Clear cache (useful for testing or manual refresh)
   */
  clearCache() {
    tokenCache.clear();
  }
}

export const coingeckoService = new CoinGeckoService();
