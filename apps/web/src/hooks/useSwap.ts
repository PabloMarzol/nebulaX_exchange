import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { swapApi, onrampApi } from '../lib/api/swapApi';
import type { SwapQuoteRequest } from '../lib/api/swapApi';
import { useAuth } from '../contexts/AuthContext';

// Hook to get swap quote
export function useSwapQuote(params: SwapQuoteRequest | null, enabled: boolean = true) {
  const { isAuthenticated } = useAuth();
  const token = isAuthenticated ? localStorage.getItem('auth_token') : null;

  return useQuery({
    queryKey: ['swap-quote', params],
    queryFn: () => (params && token ? swapApi.getQuote(params, token) : Promise.reject('Missing params or token')),
    enabled: enabled && !!params && !!token,
    staleTime: 10000, // 10 seconds
    refetchInterval: 15000, // Refresh every 15 seconds
  });
}

// Hook to get price quote (lighter)
export function usePriceQuote(params: Omit<SwapQuoteRequest, 'takerAddress'> | null, enabled: boolean = true) {
  return useQuery({
    queryKey: ['price-quote', params],
    queryFn: () => (params ? swapApi.getPrice(params) : Promise.reject('Missing params')),
    enabled: enabled && !!params,
    staleTime: 10000,
    refetchInterval: 15000,
  });
}

// Hook to get supported tokens for a chain
export function useTokens(chainId: number) {
  return useQuery({
    queryKey: ['tokens', chainId],
    queryFn: () => swapApi.getTokens(chainId),
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}

// Hook to check token allowance
export function useTokenAllowance(
  params: { tokenAddress: string; ownerAddress: string; chainId: number } | null
) {
  const { isAuthenticated } = useAuth();
  const token = isAuthenticated ? localStorage.getItem('auth_token') : null;

  return useQuery({
    queryKey: ['token-allowance', params],
    queryFn: () =>
      params && token
        ? swapApi.checkAllowance(
            {
              tokenAddress: params.tokenAddress as `0x${string}`,
              ownerAddress: params.ownerAddress as `0x${string}`,
              chainId: params.chainId,
            },
            token
          )
        : Promise.reject('Missing params or token'),
    enabled: !!params && !!token,
  });
}

// Hook to get swap history
export function useSwapHistory(limit: number = 10) {
  const { isAuthenticated } = useAuth();
  const token = isAuthenticated ? localStorage.getItem('auth_token') : null;

  return useQuery({
    queryKey: ['swap-history', limit],
    queryFn: () => (token ? swapApi.getHistory(limit, token) : Promise.reject('No token')),
    enabled: !!token,
  });
}

// Hook to record swap
export function useRecordSwap() {
  const { isAuthenticated } = useAuth();
  const token = isAuthenticated ? localStorage.getItem('auth_token') : null;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Parameters<typeof swapApi.recordSwap>[0]) => {
      if (!token) throw new Error('No auth token');
      return swapApi.recordSwap(data, token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['swap-history'] });
    },
  });
}

// Hook to update swap status
export function useUpdateSwapStatus() {
  const { isAuthenticated } = useAuth();
  const token = isAuthenticated ? localStorage.getItem('auth_token') : null;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orderId, data }: { orderId: string; data: Parameters<typeof swapApi.updateSwapStatus>[1] }) => {
      if (!token) throw new Error('No auth token');
      return swapApi.updateSwapStatus(orderId, data, token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['swap-history'] });
    },
  });
}

// OnRamp Money hooks
export function useCreateOnRampOrder() {
  const { isAuthenticated } = useAuth();
  const token = isAuthenticated ? localStorage.getItem('auth_token') : null;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Parameters<typeof onrampApi.createOrder>[0]) => {
      // No auth required - token is optional
      return onrampApi.createOrder(data, token || undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onramp-orders'] });
    },
  });
}

export function useOnRampOrders(limit: number = 10, walletAddress?: string) {
  const { isAuthenticated } = useAuth();
  const token = isAuthenticated ? localStorage.getItem('auth_token') : null;

  return useQuery({
    queryKey: ['onramp-orders', limit, walletAddress],
    queryFn: () => onrampApi.getOrders(limit, walletAddress, token || undefined),
    enabled: !!walletAddress || !!token,
  });
}

export function useOnRampOrder(orderId: string | null, walletAddress?: string) {
  const { isAuthenticated } = useAuth();
  const token = isAuthenticated ? localStorage.getItem('auth_token') : null;

  return useQuery({
    queryKey: ['onramp-order', orderId, walletAddress],
    queryFn: () =>
      orderId ? onrampApi.getOrder(orderId, walletAddress, token || undefined) : Promise.reject('Missing order ID'),
    enabled: !!orderId,
  });
}

export function useOnRampCurrencies() {
  return useQuery({
    queryKey: ['onramp-currencies'],
    queryFn: () => onrampApi.getSupportedCurrencies(),
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}

export function useOnRampCryptos() {
  return useQuery({
    queryKey: ['onramp-cryptos'],
    queryFn: async () => {
      try {
        // Try to fetch real supported coins/networks from OnRamp.Money API
        const { coins } = await onrampApi.fetchSupportedCoinsAndNetworks();
        return coins;
      } catch (error) {
        console.warn('Failed to fetch real OnRamp supported coins, using fallback:', error);
        // Fallback to hardcoded list
        return onrampApi.getSupportedCryptos();
      }
    },
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}
