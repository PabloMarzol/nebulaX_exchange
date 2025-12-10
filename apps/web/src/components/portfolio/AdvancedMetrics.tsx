/**
 * Advanced Performance Metrics Component
 * Displays Sharpe Ratio, Alpha, Beta, Max Drawdown, and other advanced metrics
 */
import { TrendingUp, TrendingDown, Target, Shield, BarChart, Zap } from 'lucide-react';

interface AdvancedMetricsData {
  sharpeRatio: number;
  alpha: number;
  beta: number;
  maxDrawdown: number;
  volatility: number;
  winRate: number;
}

interface AdvancedMetricsProps {
  data?: AdvancedMetricsData;
}

// Generate mock advanced metrics
const generateMockMetrics = (): AdvancedMetricsData => {
  return {
    sharpeRatio: Math.random() * 3 + 0.5, // 0.5 to 3.5
    alpha: (Math.random() - 0.3) * 15, // -4.5% to 10.5%
    beta: Math.random() * 1.5 + 0.5, // 0.5 to 2.0
    maxDrawdown: -(Math.random() * 25 + 5), // -5% to -30%
    volatility: Math.random() * 40 + 10, // 10% to 50%
    winRate: Math.random() * 30 + 50 // 50% to 80%
  };
};

export function AdvancedMetrics({ data }: AdvancedMetricsProps) {
  const metrics = data || generateMockMetrics();

  const metricCards = [
    {
      label: 'Sharpe Ratio',
      value: metrics.sharpeRatio.toFixed(2),
      description: 'Risk-adjusted returns',
      icon: Target,
      color: metrics.sharpeRatio > 1 ? 'text-emerald-400' : metrics.sharpeRatio > 0 ? 'text-yellow-400' : 'text-red-400',
      bg: metrics.sharpeRatio > 1 ? 'bg-emerald-500/10' : metrics.sharpeRatio > 0 ? 'bg-yellow-500/10' : 'bg-red-500/10',
      border: metrics.sharpeRatio > 1 ? 'border-emerald-500/20' : metrics.sharpeRatio > 0 ? 'border-yellow-500/20' : 'border-red-500/20',
      interpretation: metrics.sharpeRatio > 2 ? 'Excellent' : metrics.sharpeRatio > 1 ? 'Good' : metrics.sharpeRatio > 0 ? 'Fair' : 'Poor'
    },
    {
      label: 'Alpha',
      value: `${metrics.alpha >= 0 ? '+' : ''}${metrics.alpha.toFixed(2)}%`,
      description: 'Excess returns vs market',
      icon: Zap,
      color: metrics.alpha > 0 ? 'text-emerald-400' : 'text-red-400',
      bg: metrics.alpha > 0 ? 'bg-emerald-500/10' : 'bg-red-500/10',
      border: metrics.alpha > 0 ? 'border-emerald-500/20' : 'border-red-500/20',
      interpretation: metrics.alpha > 5 ? 'Outperforming' : metrics.alpha > 0 ? 'Positive' : 'Underperforming'
    },
    {
      label: 'Beta',
      value: metrics.beta.toFixed(2),
      description: 'Market correlation',
      icon: BarChart,
      color: metrics.beta < 1 ? 'text-blue-400' : metrics.beta < 1.5 ? 'text-yellow-400' : 'text-red-400',
      bg: metrics.beta < 1 ? 'bg-blue-500/10' : metrics.beta < 1.5 ? 'bg-yellow-500/10' : 'bg-red-500/10',
      border: metrics.beta < 1 ? 'border-blue-500/20' : metrics.beta < 1.5 ? 'border-yellow-500/20' : 'border-red-500/20',
      interpretation: metrics.beta < 1 ? 'Lower volatility' : metrics.beta < 1.5 ? 'Market aligned' : 'Higher volatility'
    },
    {
      label: 'Max Drawdown',
      value: `${metrics.maxDrawdown.toFixed(1)}%`,
      description: 'Largest peak-to-trough decline',
      icon: TrendingDown,
      color: metrics.maxDrawdown > -10 ? 'text-emerald-400' : metrics.maxDrawdown > -20 ? 'text-yellow-400' : 'text-red-400',
      bg: metrics.maxDrawdown > -10 ? 'bg-emerald-500/10' : metrics.maxDrawdown > -20 ? 'bg-yellow-500/10' : 'bg-red-500/10',
      border: metrics.maxDrawdown > -10 ? 'border-emerald-500/20' : metrics.maxDrawdown > -20 ? 'border-yellow-500/20' : 'border-red-500/20',
      interpretation: metrics.maxDrawdown > -10 ? 'Low risk' : metrics.maxDrawdown > -20 ? 'Moderate risk' : 'High risk'
    },
    {
      label: 'Volatility',
      value: `${metrics.volatility.toFixed(1)}%`,
      description: 'Price variation',
      icon: Shield,
      color: metrics.volatility < 20 ? 'text-emerald-400' : metrics.volatility < 35 ? 'text-yellow-400' : 'text-red-400',
      bg: metrics.volatility < 20 ? 'bg-emerald-500/10' : metrics.volatility < 35 ? 'bg-yellow-500/10' : 'bg-red-500/10',
      border: metrics.volatility < 20 ? 'border-emerald-500/20' : metrics.volatility < 35 ? 'border-yellow-500/20' : 'border-red-500/20',
      interpretation: metrics.volatility < 20 ? 'Stable' : metrics.volatility < 35 ? 'Moderate' : 'High'
    },
    {
      label: 'Win Rate',
      value: `${metrics.winRate.toFixed(0)}%`,
      description: 'Profitable trades',
      icon: TrendingUp,
      color: metrics.winRate > 60 ? 'text-emerald-400' : metrics.winRate > 45 ? 'text-yellow-400' : 'text-red-400',
      bg: metrics.winRate > 60 ? 'bg-emerald-500/10' : metrics.winRate > 45 ? 'bg-yellow-500/10' : 'bg-red-500/10',
      border: metrics.winRate > 60 ? 'border-emerald-500/20' : metrics.winRate > 45 ? 'border-yellow-500/20' : 'border-red-500/20',
      interpretation: metrics.winRate > 60 ? 'Strong' : metrics.winRate > 45 ? 'Average' : 'Weak'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {metricCards.map((metric) => {
        const MetricIcon = metric.icon;

        return (
          <div
            key={metric.label}
            className={`glass-panel p-5 rounded-xl border ${metric.border} ${metric.bg} group hover:border-white/10 transition-all`}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div>
                <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">
                  {metric.label}
                </h4>
                <p className="text-xs text-zinc-600">{metric.description}</p>
              </div>
              <div className={`p-2 rounded-lg ${metric.bg} border ${metric.border}`}>
                <MetricIcon className={`h-4 w-4 ${metric.color}`} />
              </div>
            </div>

            {/* Value */}
            <div className="mb-3">
              <div className={`text-2xl font-bold ${metric.color} tracking-tight`}>
                {metric.value}
              </div>
              <div className="text-xs text-zinc-500 mt-1">
                {metric.interpretation}
              </div>
            </div>

            {/* Progress Indicator */}
            <div className="w-full bg-zinc-800 h-1 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  metric.color.includes('emerald') ? 'bg-emerald-500' :
                  metric.color.includes('yellow') ? 'bg-yellow-500' :
                  metric.color.includes('red') ? 'bg-red-500' :
                  'bg-blue-500'
                }`}
                style={{
                  width: `${
                    metric.label === 'Sharpe Ratio' ? Math.min((parseFloat(metric.value) / 3) * 100, 100) :
                    metric.label === 'Beta' ? Math.min((parseFloat(metric.value) / 2) * 100, 100) :
                    metric.label === 'Max Drawdown' ? Math.min((Math.abs(parseFloat(metric.value)) / 30) * 100, 100) :
                    metric.label === 'Win Rate' ? parseFloat(metric.value) :
                    Math.min((parseFloat(metric.value) / 50) * 100, 100)
                  }%`
                }}
              ></div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
