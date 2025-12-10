/**
 * Hook for portfolio AI analysis
 */
import { useQuery, useMutation } from '@tanstack/react-query';
import { analyzePortfolio, Portfolio, AnalysisResponse } from '@/lib/api/aiService';

interface UsePortfolioAnalysisOptions {
  tickers: string[];
  portfolio: Portfolio;
  enabled?: boolean;
}

export function usePortfolioAnalysis({ tickers, portfolio, enabled = false }: UsePortfolioAnalysisOptions) {
  return useQuery<AnalysisResponse>({
    queryKey: ['portfolio-analysis', tickers, portfolio],
    queryFn: () => analyzePortfolio(tickers, portfolio),
    enabled: enabled && tickers.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1
  });
}

export function usePortfolioAnalysisMutation() {
  return useMutation({
    mutationFn: ({ tickers, portfolio, options }: {
      tickers: string[];
      portfolio: Portfolio;
      options?: any;
    }) => analyzePortfolio(tickers, portfolio, options)
  });
}
