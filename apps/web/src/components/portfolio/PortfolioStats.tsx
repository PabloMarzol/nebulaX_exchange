/**
 * Portfolio Statistics Component
 * Displays key portfolio metrics in card format
 */
import { Card } from '@/components/ui/card';
import { PortfolioMetrics } from '@/lib/api/aiService';
import { TrendingUp, TrendingDown, DollarSign, PieChart, Shield, Target } from 'lucide-react';

interface PortfolioStatsProps {
  metrics?: PortfolioMetrics;
  isLoading?: boolean;
}

export function PortfolioStats({ metrics, isLoading }: PortfolioStatsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
            <div className="h-8 bg-gray-200 rounded w-3/4"></div>
          </Card>
        ))}
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="text-center text-muted-foreground py-8">
        No portfolio data available
      </div>
    );
  }

  const stats = [
    {
      label: 'Total Value',
      value: `$${metrics.total_value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: DollarSign,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      label: 'Cash Available',
      value: `$${metrics.cash.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      subValue: `${(metrics.cash_pct * 100).toFixed(1)}% of portfolio`,
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      label: 'Long Exposure',
      value: `$${metrics.long_exposure.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: TrendingUp,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50'
    },
    {
      label: 'Short Exposure',
      value: `$${metrics.short_exposure.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: TrendingDown,
      color: 'text-red-600',
      bgColor: 'bg-red-50'
    },
    {
      label: 'Risk Score',
      value: `${metrics.risk_score.toFixed(0)}/100`,
      subValue: metrics.risk_score < 30 ? 'Low Risk' : metrics.risk_score < 60 ? 'Medium Risk' : 'High Risk',
      icon: Shield,
      color: metrics.risk_score < 30 ? 'text-green-600' : metrics.risk_score < 60 ? 'text-yellow-600' : 'text-red-600',
      bgColor: metrics.risk_score < 30 ? 'bg-green-50' : metrics.risk_score < 60 ? 'bg-yellow-50' : 'bg-red-50'
    },
    {
      label: 'Diversification',
      value: `${metrics.diversification_score.toFixed(0)}/100`,
      subValue: `${metrics.positions_count} positions`,
      icon: PieChart,
      color: metrics.diversification_score > 70 ? 'text-green-600' : metrics.diversification_score > 40 ? 'text-yellow-600' : 'text-red-600',
      bgColor: metrics.diversification_score > 70 ? 'bg-green-50' : metrics.diversification_score > 40 ? 'bg-yellow-50' : 'bg-red-50'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {stats.map((stat, index) => (
        <Card key={index} className="p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-muted-foreground mb-2">{stat.label}</p>
              <p className="text-2xl font-bold text-foreground mb-1">{stat.value}</p>
              {stat.subValue && (
                <p className="text-xs text-muted-foreground">{stat.subValue}</p>
              )}
            </div>
            <div className={`p-3 rounded-lg ${stat.bgColor}`}>
              <stat.icon className={`h-6 w-6 ${stat.color}`} />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
