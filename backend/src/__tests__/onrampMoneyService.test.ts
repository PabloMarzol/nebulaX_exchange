import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { onrampMoneyService, PaymentMethod } from '../services/onrampMoneyService';
import { db } from '../db/index';

// Mock dependencies
vi.mock('axios');
vi.mock('../db/index', () => ({
  db: {
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn().mockResolvedValue([{ 
            id: 'mock-order-id',
            userId: 'user-123',
            status: 'pending',
            fiatAmount: '100',
            fiatCurrency: 'USD',
            cryptoAmount: '98',
            cryptoCurrency: 'USDT',
            network: 'erc20',
            walletAddress: '0x123',
            paymentMethod: 1,
            merchantRecognitionId: 'mock-recog-id',
            providerOrderId: 'mock-provider-id',
            onrampUrl: 'https://mock.url',
            createdAt: new Date(),
            updatedAt: new Date()
        }])
      }))
    })),
    select: vi.fn(),
    update: vi.fn(),
  }
}));

// Mock env variables
vi.mock('../config/env.js', () => ({
  env: {
    ONRAMP_API_LIVE_KEY: 'mock-api-key',
    ONRAMP_APP_LIVE_SECRET_KEY: 'mock-secret-key',
    ONRAMP_APP_LIVE_ID: 'mock-app-id',
    ONRAMP_BASE_URL: 'https://onramp.money',
    API_URL: 'https://api.nebulax.com'
  }
}));

describe('OnRampMoneyService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getQuote', () => {
    it('should fetch a quote successfully', async () => {
      const mockQuoteResponse = {
        data: {
          data: {
            rate: 1,
            quantity: 98,
            onrampFee: 1,
            clientFee: 0.5,
            gatewayFee: 0.5,
            gasFee: 0
          }
        }
      };
      
      // Mock asset details call first (called internally)
      (axios.get as any).mockResolvedValueOnce({
          data: {
              data: {
                  allCoinConfig: {
                      'USDT': { coinId: 100, networks: [1] }
                  },
                  networkConfig: {
                      '1': { chainSymbol: 'erc20' }
                  }
              }
          }
      });

      (axios.post as any).mockResolvedValueOnce(mockQuoteResponse);

      const quote = await onrampMoneyService.getQuote({
        fiatAmount: 100,
        fiatCurrency: 'USD',
        cryptoCurrency: 'USDT',
        network: 'erc20'
      });

      expect(quote).toBeDefined();
      expect(quote.fiatAmount).toBe(100);
      expect(quote.cryptoAmount).toBe(98);
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('/onramp/api/v2/common/transaction/quotes'),
        expect.any(Object),
        expect.any(Object)
      );
    });
  });

  describe('createIntent', () => {
    it('should create an intent successfully', async () => {
      // Mock asset details
      (axios.get as any).mockResolvedValueOnce({
          data: {
              data: {
                  allCoinConfig: {
                      'USDT': { coinId: 100, networks: [1] }
                  },
                  networkConfig: {
                      '1': { chainSymbol: 'erc20' }
                  }
              }
          }
      });

      // Mock createIntent response
      (axios.post as any).mockResolvedValueOnce({
        data: {
            status: 1,
            data: {
                hash: 'mock-hash-123'
            },
            code: 200
        }
      });

      const result = await onrampMoneyService.createIntent({
        cryptoCurrency: 'USDT',
        network: 'erc20',
        cryptoAmount: 100,
        redirectURL: 'https://callback.com',
        language: 'en'
      });

      expect(result).toEqual({ hash: 'mock-hash-123' });
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('/onramp-merchants/widget/createIntent'),
        expect.objectContaining({
            coinId: '100', // stringified
            chainId: '1'
        }),
        expect.any(Object)
      );
    });
  });

  describe('createOrder', () => {
    it('should create an order successfully', async () => {
        // Mock quote call (internal)
        // Mock asset details (internal)
        
        // 1. getQuote -> getAssetDetails
        (axios.get as any).mockResolvedValueOnce({
            data: {
                data: {
                    allCoinConfig: {
                        'USDT': { coinId: 100, networks: [1] }
                    },
                    networkConfig: {
                        '1': { chainSymbol: 'erc20' }
                    }
                }
            }
        });

        // 2. getQuote -> quote api
        (axios.post as any).mockResolvedValueOnce({
            data: {
                data: {
                    rate: 1,
                    quantity: 98,
                    onrampFee: 2,
                    clientFee: 0,
                    gatewayFee: 0,
                    gasFee: 0
                }
            }
        });

        // 3. createOrder -> getAssetDetails again (implementation details)
        (axios.get as any).mockResolvedValueOnce({
            data: {
                data: {
                    allCoinConfig: {
                        'USDT': { coinId: 100, networks: [1] }
                    },
                    networkConfig: {
                        '1': { chainSymbol: 'erc20' }
                    }
                }
            }
        });

        // 4. createOrder -> order api
        (axios.post as any).mockResolvedValueOnce({
            data: {
                data: {
                    orderId: 'mock-provider-id',
                    address: 'mock-deposit-addr',
                    endTime: Math.floor(Date.now() / 1000) + 3600
                }
            }
        });

        const order = await onrampMoneyService.createOrder({
            userId: 'user-123',
            fiatAmount: 100,
            fiatCurrency: 'USD',
            cryptoCurrency: 'USDT',
            network: 'erc20',
            walletAddress: '0x123',
            paymentMethod: PaymentMethod.INSTANT
        });

        expect(order).toBeDefined();
        expect(order.id).toBe('mock-order-id');
        expect(db.insert).toHaveBeenCalled();
        expect(axios.post).toHaveBeenCalledTimes(2); // Quote and CreateOrder (well, actually 2 post calls and 2 get calls?)
        // axios.post calls: quote, createOrder.
    });
  });
});
