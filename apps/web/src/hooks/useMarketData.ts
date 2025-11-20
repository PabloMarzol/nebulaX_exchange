import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api/client';

interface Symbol {
  symbol: string;
  maxLeverage: number;
  onlyIsolated: boolean;
}

interface Orderbook {
  levels: Array<[string, string]>[];
  time: number;
}

interface Candle {
  t: number; // timestamp
  o: string; // open
  h: string; // high
  l: string; // low
  c: string; // close
  v: string; // volume
}

interface MarketStats {
  symbol: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  change: number;
  changePercent: number;
  timestamp: number;
}

interface Order {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  type: 'limit' | 'market';
  price: string | null;
  quantity: string;
  filledQuantity: string;
  status: string;
  createdAt: string;
}

interface Position {
  symbol: string;
  side: 'long' | 'short';
  quantity: number;
  entryPrice: string;
  markPrice: string;
  liquidationPrice: string | null;
  leverage: string | null;
  unrealizedPnl: string;
  margin: string;
}

interface PlaceOrderParams {
  symbol: string;
  side: 'buy' | 'sell';
  type: 'limit' | 'market';
  price?: number;
  quantity: number;
  leverage?: number;
  timeInForce?: 'Gtc' | 'Ioc' | 'Alo';
  reduceOnly?: boolean;
  postOnly?: boolean;
}

/**
 * Fetch available trading symbols
 */
export function useSymbols() {
  return useQuery<{ symbols: Symbol[] }>({
    queryKey: ['symbols'],
    queryFn: async () => {
      const response = await apiClient.get('/api/market/symbols');
      return response.data.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Fetch current prices (all or specific symbol)
 */
export function usePrices(symbol?: string) {
  return useQuery<Record<string, string>>({
    queryKey: ['prices', symbol],
    queryFn: async () => {
      const response = await apiClient.get('/api/market/prices', {
        params: { symbol },
      });
      return response.data.data;
    },
    staleTime: 1000, // 1 second
    refetchInterval: 5000, // Refetch every 5 seconds
  });
}

/**
 * Fetch orderbook for a specific symbol
 */
export function useOrderbook(symbol: string, enabled: boolean = true) {
  return useQuery<Orderbook>({
    queryKey: ['orderbook', symbol],
    queryFn: async () => {
      const response = await apiClient.get('/api/market/orderbook', {
        params: { symbol },
      });
      return response.data.data;
    },
    enabled: enabled && !!symbol,
    staleTime: 0, // Always consider stale (real-time data)
    refetchInterval: 2000, // Refetch every 2 seconds as fallback
  });
}

/**
 * Fetch candle data for a specific symbol
 */
export function useCandles(
  symbol: string,
  interval: string = '1h',
  startTime?: number,
  endTime?: number,
  enabled: boolean = true
) {
  return useQuery<Candle[]>({
    queryKey: ['candles', symbol, interval, startTime, endTime],
    queryFn: async () => {
      const response = await apiClient.get('/api/market/candles', {
        params: {
          symbol,
          interval,
          startTime: startTime?.toString(),
          endTime: endTime?.toString(),
        },
      });
      return response.data.data;
    },
    enabled: enabled && !!symbol,
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Fetch 24h market statistics
 */
export function useMarketStats(symbol: string, enabled: boolean = true) {
  return useQuery<MarketStats>({
    queryKey: ['marketStats', symbol],
    queryFn: async () => {
      const response = await apiClient.get('/api/market/24h-stats', {
        params: { symbol },
      });
      return response.data.data;
    },
    enabled: enabled && !!symbol,
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: 60 * 1000, // Refetch every minute
  });
}

/**
 * Fetch user's open orders
 */
export function useOpenOrders(symbol?: string) {
  return useQuery<Order[]>({
    queryKey: ['openOrders', symbol],
    queryFn: async () => {
      const response = await apiClient.get('/api/trading/orders/open', {
        params: { symbol },
      });
      return response.data.data;
    },
    staleTime: 5000, // 5 seconds
    refetchInterval: 10000, // Refetch every 10 seconds
  });
}

/**
 * Fetch user's order history
 */
export function useOrderHistory(symbol?: string, limit: number = 100) {
  return useQuery<Order[]>({
    queryKey: ['orderHistory', symbol, limit],
    queryFn: async () => {
      const response = await apiClient.get('/api/trading/orders', {
        params: { symbol, limit: limit.toString() },
      });
      return response.data.data;
    },
    staleTime: 30000, // 30 seconds
  });
}

/**
 * Fetch user's positions
 */
export function usePositions(symbol?: string) {
  return useQuery<Position[]>({
    queryKey: ['positions', symbol],
    queryFn: async () => {
      const response = await apiClient.get('/api/trading/positions', {
        params: { symbol },
      });
      return response.data.data;
    },
    staleTime: 5000, // 5 seconds
    refetchInterval: 10000, // Refetch every 10 seconds
  });
}

/**
 * Place a new order
 */
export function usePlaceOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: PlaceOrderParams) => {
      const response = await apiClient.post('/api/trading/orders', params);
      return response.data;
    },
    onSuccess: () => {
      // Invalidate queries to refetch data
      queryClient.invalidateQueries({ queryKey: ['openOrders'] });
      queryClient.invalidateQueries({ queryKey: ['orderHistory'] });
      queryClient.invalidateQueries({ queryKey: ['positions'] });
    },
  });
}

/**
 * Cancel a specific order
 */
export function useCancelOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ orderId, symbol }: { orderId: string; symbol: string }) => {
      const response = await apiClient.delete(`/api/trading/orders/${orderId}`, {
        params: { symbol },
      });
      return response.data;
    },
    onSuccess: () => {
      // Invalidate queries to refetch data
      queryClient.invalidateQueries({ queryKey: ['openOrders'] });
      queryClient.invalidateQueries({ queryKey: ['orderHistory'] });
    },
  });
}

/**
 * Cancel all orders
 */
export function useCancelAllOrders() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (symbol?: string) => {
      const response = await apiClient.delete('/api/trading/orders', {
        params: { symbol },
      });
      return response.data;
    },
    onSuccess: () => {
      // Invalidate queries to refetch data
      queryClient.invalidateQueries({ queryKey: ['openOrders'] });
      queryClient.invalidateQueries({ queryKey: ['orderHistory'] });
    },
  });
}
