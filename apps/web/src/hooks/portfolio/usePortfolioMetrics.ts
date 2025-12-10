/**
 * Hook for portfolio metrics calculation
 */
import { useQuery } from '@tanstack/react-query';
import { calculatePortfolioMetrics, Portfolio, PortfolioMetrics } from '@/lib/api/aiService';

interface UsePortfolioMetricsOptions {
  portfolio: Portfolio;
  tickers: string[];
  enabled?: boolean;
}

export function usePortfolioMetrics({ portfolio, tickers, enabled = true }: UsePortfolioMetricsOptions) {
  return useQuery<PortfolioMetrics>({
    queryKey: ['portfolio-metrics', portfolio, tickers],
    queryFn: () => calculatePortfolioMetrics(portfolio, tickers),
    enabled: enabled && tickers.length > 0,
    staleTime: 1 * 60 * 1000, // 1 minute
    refetchInterval: 30000 // Refetch every 30 seconds
  });
}
