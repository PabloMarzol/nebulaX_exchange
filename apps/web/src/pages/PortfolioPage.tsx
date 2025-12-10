import { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { usePortfolioAnalysisMutation } from '@/hooks/portfolio/usePortfolioAnalysis';
import { usePortfolioMetrics } from '@/hooks/portfolio/usePortfolioMetrics';
import { Portfolio } from '@/lib/api/aiService';
import {
  Loader2,
  RefreshCw,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Brain,
  Shield,
  PieChart,
  Activity,
  AlertTriangle,
  BarChart3,
  History,
  Eye,
  Download,
  ArrowUpRight,
  ShoppingCart,
  Repeat
} from 'lucide-react';

// Import new components
import { PortfolioPerformanceChart } from '@/components/portfolio/PortfolioPerformanceChart';
import { ProfitLossTracker } from '@/components/portfolio/ProfitLossTracker';
import { TransactionHistory } from '@/components/portfolio/TransactionHistory';
import { MarketOverview } from '@/components/portfolio/MarketOverview';
import { AdvancedMetrics } from '@/components/portfolio/AdvancedMetrics';
import { Watchlist } from '@/components/portfolio/Watchlist';

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

const AGENT_INFO = {
  bill_ackman: { name: 'Bill Ackman', icon: '💼', description: 'Value Investor' },
  michael_burry: { name: 'Michael Burry', icon: '🎯', description: 'Contrarian' },
  technical_analyst: { name: 'Technical Analyst', icon: '📊', description: 'Chart Patterns' },
  risk_manager: { name: 'Risk Manager', icon: '🛡️', description: 'Risk Assessment' }
};

type TimeFrame = '1D' | '1W' | '1M' | '3M' | '1Y' | 'All';
type TabType = 'overview' | 'analytics' | 'transactions' | 'market' | 'watchlist';

export function PortfolioPage() {
  const [, setLocation] = useLocation();
  const [portfolio] = useState<Portfolio>(MOCK_PORTFOLIO);
  const [tickers] = useState<string[]>(MOCK_TICKERS);
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('1M');
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  const {
    data: metricsData,
    isLoading: metricsLoading,
    refetch: refetchMetrics
  } = usePortfolioMetrics({
    portfolio,
    tickers,
    enabled: true
  });

  const analysisMutation = usePortfolioAnalysisMutation();

  const handleRunAnalysis = async () => {
    try {
      const result = await analysisMutation.mutateAsync({
        tickers,
        portfolio,
        options: {}
      });
      setAnalysisData(result);
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

  const handleExport = () => {
    const exportData = {
      portfolio,
      metrics: metricsData,
      analysis: analysisData,
      timestamp: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `portfolio-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Calculate AI consensus
  const getAIConsensus = () => {
    if (!analysisData?.decisions) return { sentiment: 'Neutral', color: 'text-zinc-400', count: 0 };

    const decisions = Object.values(analysisData.decisions) as any[];
    const bullish = decisions.filter(d => d.action === 'buy' || d.action === 'hold').length;
    const bearish = decisions.filter(d => d.action === 'sell' || d.action === 'short').length;

    if (bullish > bearish) return { sentiment: 'Bullish', color: 'text-emerald-400', count: bullish };
    if (bearish > bullish) return { sentiment: 'Bearish', color: 'text-red-400', count: bearish };
    return { sentiment: 'Neutral', color: 'text-zinc-400', count: decisions.length };
  };

  const consensus = getAIConsensus();

  const timeFrames: TimeFrame[] = ['1D', '1W', '1M', '3M', '1Y', 'All'];

  const tabs = [
    { id: 'overview' as const, label: 'Overview', icon: BarChart3 },
    { id: 'analytics' as const, label: 'AI Analytics', icon: Brain },
    { id: 'transactions' as const, label: 'Transactions', icon: History },
    { id: 'market' as const, label: 'Market', icon: Activity },
    { id: 'watchlist' as const, label: 'Watchlist', icon: Eye }
  ];

  return (
    <div className="space-y-6 p-8 bg-[#050505] min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-medium tracking-tight text-white">Portfolio Analytics</h1>
          <p className="text-sm text-zinc-500 mt-1">AI-powered portfolio analysis and insights</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            className="bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-white"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={metricsLoading || analysisMutation.isPending}
            className="bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-white"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${metricsLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={handleRunAnalysis}
            disabled={analysisMutation.isPending}
            className="bg-white text-black hover:bg-zinc-200 shadow-[0_0_15px_rgba(255,255,255,0.1)]"
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Balance */}
        <div className="glass-panel p-6 rounded-xl relative overflow-hidden group border border-white/5 bg-white/[0.02]">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Activity className="w-16 h-16" />
          </div>
          <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">Total Value</h3>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-medium text-white tracking-tight">
              ${metricsData?.total_value?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
            </span>
            <span className="text-xs font-medium text-zinc-500">USD</span>
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs">
            <span className="text-zinc-500">
              Cash: ${metricsData?.cash?.toLocaleString() || '0'} ({((metricsData?.cash_pct || 0) * 100).toFixed(1)}%)
            </span>
          </div>
        </div>

        {/* Risk Score */}
        <div className="glass-panel p-6 rounded-xl border border-white/5 bg-white/[0.02]">
          <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">Risk Score</h3>
          <div className="flex items-baseline gap-2">
            <span className={`text-3xl font-medium tracking-tight ${
              (metricsData?.risk_score || 0) < 30 ? 'text-emerald-400' :
              (metricsData?.risk_score || 0) < 60 ? 'text-yellow-400' :
              'text-red-400'
            }`}>
              {metricsData?.risk_score?.toFixed(0) || '0'}
            </span>
            <span className="text-zinc-500 text-sm">/100</span>
          </div>
          <div className="mt-4 text-xs">
            <span className={
              (metricsData?.risk_score || 0) < 30 ? 'text-emerald-500' :
              (metricsData?.risk_score || 0) < 60 ? 'text-yellow-500' :
              'text-red-500'
            }>
              {(metricsData?.risk_score || 0) < 30 ? 'Low Risk' :
               (metricsData?.risk_score || 0) < 60 ? 'Medium Risk' :
               'High Risk'}
            </span>
            <span className="text-zinc-600 mx-1">•</span>
            <span className="text-zinc-500">{metricsData?.positions_count || 0} positions</span>
          </div>
        </div>

        {/* AI Sentiment */}
        <div className="glass-panel p-6 rounded-xl border border-white/5 bg-white/[0.02]">
          <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">AI Sentiment</h3>
          <div className="flex items-center gap-2">
            <span className={`text-2xl font-medium ${consensus.color}`}>{consensus.sentiment}</span>
            <div className="flex space-x-1">
              <div className={`w-2 h-2 rounded-full ${consensus.sentiment === 'Bullish' ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-700'}`}></div>
              <div className={`w-2 h-2 rounded-full ${consensus.sentiment === 'Bullish' ? 'bg-emerald-500/50' : 'bg-zinc-700'}`}></div>
              <div className={`w-2 h-2 rounded-full ${consensus.sentiment === 'Bullish' ? 'bg-emerald-500/20' : 'bg-zinc-700'}`}></div>
            </div>
          </div>
          <div className="text-xs text-zinc-500 mt-2">
            {analysisData ? `Based on ${consensus.count} agent signals` : 'Run analysis to see AI sentiment'}
          </div>
        </div>
      </div>

      {/* Profit/Loss Tracker */}
      <ProfitLossTracker currentValue={metricsData?.total_value || 0} />

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-zinc-800">
        {tabs.map((tab) => {
          const TabIcon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all border-b-2 ${
                isActive
                  ? 'text-white border-white'
                  : 'text-zinc-500 border-transparent hover:text-zinc-300'
              }`}
            >
              <TabIcon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Time Frame Selector */}
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-white">Portfolio Performance</h3>
            <div className="flex gap-1 bg-zinc-900 rounded-lg p-1 border border-zinc-800">
              {timeFrames.map((tf) => (
                <button
                  key={tf}
                  onClick={() => setTimeFrame(tf)}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                    timeFrame === tf
                      ? 'bg-white text-black'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>

          {/* Performance Chart */}
          <div className="glass-panel p-6 rounded-xl border border-white/5 bg-white/[0.02]">
            <PortfolioPerformanceChart
              timeframe={timeFrame}
              currentValue={metricsData?.total_value || 0}
            />
          </div>

          {/* Main Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - 2/3 width */}
            <div className="lg:col-span-2 space-y-6">
              {/* Asset Allocation Chart */}
              <div className="glass-panel rounded-xl p-6 border border-white/5 bg-white/[0.02]">
                <div className="flex items-center gap-2 mb-6">
                  <PieChart className="h-5 w-5 text-white" />
                  <h3 className="text-sm font-medium text-white">Asset Allocation</h3>
                </div>
                <div className="space-y-4">
                  {Object.entries(portfolio.positions).map(([ticker, position]) => {
                    const value = position.long * position.long_cost_basis;
                    const percentage = (value / (metricsData?.total_value || 1)) * 100;
                    return (
                      <div key={ticker}>
                        <div className="flex justify-between items-center text-sm mb-2">
                          <div className="flex items-center gap-3">
                            <span className="text-zinc-300 font-medium">{ticker}</span>
                            <span className="text-xs text-zinc-600">
                              {position.long} @ ${position.long_cost_basis.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-white font-mono">{percentage.toFixed(1)}%</span>
                            {/* Quick Actions */}
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => setLocation('/trading')}
                                className="p-1 hover:bg-emerald-500/10 rounded text-emerald-400"
                                title="Buy more"
                              >
                                <ShoppingCart className="h-3 w-3" />
                              </button>
                              <button
                                onClick={() => setLocation('/trading')}
                                className="p-1 hover:bg-red-500/10 rounded text-red-400"
                                title="Sell"
                              >
                                <ArrowUpRight className="h-3 w-3" />
                              </button>
                              <button
                                onClick={() => setLocation('/swap')}
                                className="p-1 hover:bg-blue-500/10 rounded text-blue-400"
                                title="Swap"
                              >
                                <Repeat className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                        <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden group">
                          <div
                            className="bg-white h-full rounded-full transition-all duration-500"
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-zinc-300 font-medium">Cash</span>
                      <span className="text-white font-mono">{((metricsData?.cash_pct || 0) * 100).toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-zinc-600 h-full rounded-full transition-all duration-500"
                        style={{ width: `${(metricsData?.cash_pct || 0) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Advanced Metrics */}
              <div>
                <h3 className="text-lg font-medium text-white mb-4">Advanced Metrics</h3>
                <AdvancedMetrics />
              </div>
            </div>

            {/* Right Column - 1/3 width */}
            <div className="space-y-6">
              {/* Diversification Score */}
              <div className="glass-panel p-6 rounded-xl border border-white/5 bg-white/[0.02]">
                <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-4">Diversification</h3>
                <div className="flex items-center justify-center mb-4">
                  <div className="relative w-32 h-32">
                    <svg className="transform -rotate-90 w-32 h-32">
                      <circle
                        cx="64"
                        cy="64"
                        r="56"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="transparent"
                        className="text-zinc-800"
                      />
                      <circle
                        cx="64"
                        cy="64"
                        r="56"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="transparent"
                        strokeDasharray={`${2 * Math.PI * 56}`}
                        strokeDashoffset={`${2 * Math.PI * 56 * (1 - (metricsData?.diversification_score || 0) / 100)}`}
                        className={
                          (metricsData?.diversification_score || 0) > 70 ? 'text-emerald-500' :
                          (metricsData?.diversification_score || 0) > 40 ? 'text-yellow-500' :
                          'text-red-500'
                        }
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-2xl font-bold text-white">
                        {metricsData?.diversification_score?.toFixed(0) || '0'}
                      </span>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-zinc-500 text-center">
                  {(metricsData?.diversification_score || 0) > 70 ? 'Well diversified portfolio' :
                   (metricsData?.diversification_score || 0) > 40 ? 'Moderate diversification' :
                   'Consider diversifying more'}
                </p>
              </div>

              {/* Risk Warnings */}
              {metricsData && (metricsData.risk_score > 60 || metricsData.largest_position_pct > 0.5) && (
                <div className="glass-panel p-6 rounded-xl border border-red-500/20 bg-red-500/5">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="h-4 w-4 text-red-400" />
                    <h3 className="text-xs font-medium text-red-400 uppercase tracking-wider">Risk Warnings</h3>
                  </div>
                  <div className="space-y-2 text-xs text-red-300">
                    {metricsData.risk_score > 60 && (
                      <p>• High portfolio risk detected</p>
                    )}
                    {metricsData.largest_position_pct > 0.5 && (
                      <p>• Position concentration above 50%</p>
                    )}
                    {metricsData.diversification_score < 40 && (
                      <p>• Low diversification score</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {/* AI Trading Signals */}
          {analysisData?.decisions ? (
            <div className="space-y-6">
              <div className="glass-panel rounded-xl p-6 border border-white/5 bg-white/[0.02]">
                <div className="flex items-center gap-2 mb-6">
                  <Activity className="h-5 w-5 text-white" />
                  <h3 className="text-sm font-medium text-white">AI Trading Signals</h3>
                </div>
                <div className="space-y-4">
                  {Object.entries(analysisData.decisions).map(([ticker, decision]: [string, any]) => {
                    const actionConfig = {
                      buy: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: TrendingUp },
                      sell: { color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', icon: TrendingDown },
                      hold: { color: 'text-zinc-400', bg: 'bg-zinc-900', border: 'border-zinc-800', icon: Activity }
                    }[decision.action] || { color: 'text-zinc-400', bg: 'bg-zinc-900', border: 'border-zinc-800', icon: Activity };

                    const ActionIcon = actionConfig.icon;

                    return (
                      <div key={ticker} className={`p-4 rounded-lg border ${actionConfig.border} ${actionConfig.bg}`}>
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-bold text-white text-lg">{ticker}</h4>
                            <span className={`text-xs font-semibold uppercase ${actionConfig.color}`}>
                              {decision.action}
                            </span>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-white">
                              {decision.quantity > 0 ? decision.quantity.toLocaleString() : '-'}
                            </p>
                            <p className="text-xs text-zinc-500">
                              {decision.confidence.toFixed(0)}% confidence
                            </p>
                          </div>
                        </div>
                        <div className="mt-2">
                          <div className="w-full bg-zinc-800 h-1 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                decision.confidence > 75 ? 'bg-emerald-500' :
                                decision.confidence > 50 ? 'bg-yellow-500' :
                                'bg-red-500'
                              }`}
                              style={{ width: `${decision.confidence}%` }}
                            ></div>
                          </div>
                        </div>
                        <p className="text-xs text-zinc-400 mt-3 line-clamp-2">{decision.reasoning}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* AI Agent Insights */}
              {Object.keys(analysisData.decisions).length > 0 && (
                <div className="glass-panel p-6 rounded-xl border border-white/5 bg-white/[0.02]">
                  <div className="flex items-center gap-2 mb-4">
                    <Brain className="h-5 w-5 text-white" />
                    <h3 className="text-sm font-medium text-white">AI Agents</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {Object.entries(analysisData.decisions[Object.keys(analysisData.decisions)[0]]?.agent_signals || {}).map(([agentKey, signal]: [string, any]) => {
                      const agentInfo = AGENT_INFO[agentKey as keyof typeof AGENT_INFO];
                      if (!agentInfo) return null;

                      const signalColor =
                        signal.signal === 'bullish' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' :
                        signal.signal === 'bearish' ? 'text-red-400 bg-red-500/10 border-red-500/20' :
                        'text-zinc-400 bg-zinc-900 border-zinc-800';

                      return (
                        <div key={agentKey} className={`border rounded-lg p-3 ${signalColor}`}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{agentInfo.icon}</span>
                              <div>
                                <h4 className="font-semibold text-xs text-white">{agentInfo.name}</h4>
                                <p className="text-[10px] text-zinc-500">{agentInfo.description}</p>
                              </div>
                            </div>
                            <span className="text-xs font-bold">{signal.confidence.toFixed(0)}%</span>
                          </div>
                          <div className="w-full bg-zinc-800 h-1 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                signal.signal === 'bullish' ? 'bg-emerald-500' :
                                signal.signal === 'bearish' ? 'bg-red-500' :
                                'bg-zinc-400'
                              }`}
                              style={{ width: `${signal.confidence}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="border-2 border-dashed border-zinc-800 rounded-xl p-12 text-center">
              <div className="w-12 h-12 bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-4 text-zinc-500">
                <Sparkles className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-medium text-white mb-1">AI Analysis Not Run</h3>
              <p className="text-xs text-zinc-500 mb-4">
                Click "Run AI Analysis" to get trading recommendations from our AI agents
              </p>
              <Button
                onClick={handleRunAnalysis}
                disabled={analysisMutation.isPending}
                className="bg-white text-black hover:bg-zinc-200"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Run AI Analysis
              </Button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'transactions' && (
        <div className="space-y-6">
          <div className="glass-panel rounded-xl p-6 border border-white/5 bg-white/[0.02]">
            <div className="flex items-center gap-2 mb-6">
              <History className="h-5 w-5 text-white" />
              <h3 className="text-sm font-medium text-white">Recent Transactions</h3>
            </div>
            <TransactionHistory limit={15} />
          </div>
        </div>
      )}

      {activeTab === 'market' && (
        <div className="space-y-6">
          <div className="glass-panel rounded-xl p-6 border border-white/5 bg-white/[0.02]">
            <MarketOverview />
          </div>
        </div>
      )}

      {activeTab === 'watchlist' && (
        <div className="space-y-6">
          <div className="glass-panel rounded-xl p-6 border border-white/5 bg-white/[0.02]">
            <Watchlist />
          </div>
        </div>
      )}

      {/* Analysis Footer */}
      {analysisData && (
        <div className="glass-panel rounded-lg p-4 text-xs text-zinc-500 border border-white/5 bg-white/[0.02]">
          <p>
            Last analyzed: {new Date(analysisData.timestamp).toLocaleString()} •{' '}
            {Object.keys(analysisData.decisions).length} asset{Object.keys(analysisData.decisions).length !== 1 ? 's' : ''} analyzed •{' '}
            Using Groq/Llama 3.3 70B
          </p>
        </div>
      )}
    </div>
  );
}
