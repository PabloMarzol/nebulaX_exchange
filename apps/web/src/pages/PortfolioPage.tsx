import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { PortfolioStats } from '@/components/portfolio/PortfolioStats';
import { AIInsightsPanel } from '@/components/portfolio/AIInsightsPanel';
import { TradingSignalsPanel } from '@/components/portfolio/TradingSignalsPanel';
import { AssetAllocationChart } from '@/components/portfolio/AssetAllocationChart';
import { RiskMetricsPanel } from '@/components/portfolio/RiskMetricsPanel';
import { usePortfolioAnalysisMutation } from '@/hooks/portfolio/usePortfolioAnalysis';
import { usePortfolioMetrics } from '@/hooks/portfolio/usePortfolioMetrics';
import { Portfolio } from '@/lib/api/aiService';
import { Loader2, RefreshCw, Sparkles } from 'lucide-react';

// Mock portfolio data - replace with actual user portfolio data
const MOCK_PORTFOLIO: Portfolio = {
  cash: 10000,
  positions: {
    BTC: {
      long: 0.5,
      short: 0,
      long_cost_basis: 45000,
      short_cost_basis: 0
    },
    ETH: {
      long: 5,
      short: 0,
      long_cost_basis: 2500,
      short_cost_basis: 0
    },
    SOL: {
      long: 50,
      short: 0,
      long_cost_basis: 100,
      short_cost_basis: 0
    }
  }
};

const MOCK_TICKERS = ['BTC', 'ETH', 'SOL'];

export function PortfolioPage() {
  const [portfolio] = useState<Portfolio>(MOCK_PORTFOLIO);
  const [tickers] = useState<string[]>(MOCK_TICKERS);
  const [analysisData, setAnalysisData] = useState<any>(null);

  // Fetch portfolio metrics
  const {
    data: metricsData,
    isLoading: metricsLoading,
    refetch: refetchMetrics
  } = usePortfolioMetrics({
    portfolio,
    tickers,
    enabled: true
  });

  // Analysis mutation
  const analysisMutation = usePortfolioAnalysisMutation();

  const handleRunAnalysis = async () => {
    try {
      const result = await analysisMutation.mutateAsync({
        tickers,
        portfolio,
        options: {}
      });

      setAnalysisData(result);

      console.log('Analysis complete:', result);
    } catch (error: any) {
      console.error('Analysis failed:', error);
    }
  };

  const handleRefresh = () => {
    refetchMetrics();
    if (analysisData) {
      handleRunAnalysis();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Portfolio Analytics</h1>
          <p className="text-muted-foreground mt-1">
            AI-powered portfolio analysis and insights
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={metricsLoading || analysisMutation.isPending}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${metricsLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={handleRunAnalysis}
            disabled={analysisMutation.isPending}
          >
            {analysisMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Run AI Analysis
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Portfolio Stats */}
      <PortfolioStats metrics={metricsData} isLoading={metricsLoading} />

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Charts */}
        <div className="lg:col-span-2 space-y-6">
          {/* Asset Allocation */}
          <AssetAllocationChart
            portfolio={portfolio}
            isLoading={metricsLoading}
          />

          {/* Trading Signals */}
          {analysisData?.decisions && (
            <TradingSignalsPanel
              decisions={analysisData.decisions}
              isLoading={analysisMutation.isPending}
            />
          )}

          {!analysisData && !analysisMutation.isPending && (
            <div className="border-2 border-dashed rounded-lg p-12 text-center">
              <Sparkles className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">AI Analysis Not Run</h3>
              <p className="text-muted-foreground mb-4">
                Click "Run AI Analysis" to get trading recommendations from our AI agents
              </p>
              <Button onClick={handleRunAnalysis} disabled={analysisMutation.isPending}>
                <Sparkles className="h-4 w-4 mr-2" />
                Run AI Analysis
              </Button>
            </div>
          )}
        </div>

        {/* Right Column - Insights and Risk */}
        <div className="space-y-6">
          {/* Risk Metrics */}
          <RiskMetricsPanel metrics={metricsData} isLoading={metricsLoading} />

          {/* AI Insights */}
          {analysisData?.decisions && Object.keys(analysisData.decisions).length > 0 && (
            <AIInsightsPanel
              agentSignals={analysisData.decisions[Object.keys(analysisData.decisions)[0]]?.agent_signals || {}}
              isLoading={analysisMutation.isPending}
            />
          )}
        </div>
      </div>

      {/* Analysis Footer Info */}
      {analysisData && (
        <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
          <p>
            Last analyzed: {new Date(analysisData.timestamp).toLocaleString()} •{' '}
            {Object.keys(analysisData.decisions).length} asset{Object.keys(analysisData.decisions).length !== 1 ? 's' : ''} analyzed
          </p>
        </div>
      )}
    </div>
  );
}
