/**
 * Risk Metrics Panel Component
 * Displays portfolio risk analysis and warnings
 */
import { Card } from '@/components/ui/card';
import { PortfolioMetrics } from '@/lib/api/aiService';
import { Shield, AlertTriangle, CheckCircle, AlertCircle, Activity } from 'lucide-react';

interface RiskMetricsPanelProps {
  metrics?: PortfolioMetrics;
  isLoading?: boolean;
}

function getRiskLevel(score: number): {
  label: string;
  color: string;
  bgColor: string;
  icon: typeof CheckCircle;
} {
  if (score < 30) {
    return {
      label: 'Low Risk',
      color: 'text-green-700',
      bgColor: 'bg-green-50',
      icon: CheckCircle
    };
  } else if (score < 60) {
    return {
      label: 'Medium Risk',
      color: 'text-yellow-700',
      bgColor: 'bg-yellow-50',
      icon: AlertCircle
    };
  } else {
    return {
      label: 'High Risk',
      color: 'text-red-700',
      bgColor: 'bg-red-50',
      icon: AlertTriangle
    };
  }
}

export function RiskMetricsPanel({ metrics, isLoading }: RiskMetricsPanelProps) {
  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Risk Analysis</h3>
        </div>
        <div className="space-y-4 animate-pulse">
          <div className="h-24 bg-gray-200 rounded"></div>
          <div className="h-16 bg-gray-200 rounded"></div>
          <div className="h-16 bg-gray-200 rounded"></div>
        </div>
      </Card>
    );
  }

  if (!metrics) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Risk Analysis</h3>
        </div>
        <div className="text-center text-muted-foreground py-8">
          <Shield className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>No risk data available</p>
        </div>
      </Card>
    );
  }

  const riskLevel = getRiskLevel(metrics.risk_score);
  const RiskIcon = riskLevel.icon;

  // Calculate warnings
  const warnings = [];
  if (metrics.largest_position_pct > 0.5) {
    warnings.push({
      type: 'concentration',
      message: `High concentration: Largest position is ${(metrics.largest_position_pct * 100).toFixed(1)}% of portfolio`,
      severity: 'high'
    });
  } else if (metrics.largest_position_pct > 0.3) {
    warnings.push({
      type: 'concentration',
      message: `Moderate concentration: Largest position is ${(metrics.largest_position_pct * 100).toFixed(1)}% of portfolio`,
      severity: 'medium'
    });
  }

  if (metrics.diversification_score < 40) {
    warnings.push({
      type: 'diversification',
      message: `Low diversification: Only ${metrics.positions_count} position(s)`,
      severity: 'high'
    });
  }

  if (metrics.cash_pct < 0.1) {
    warnings.push({
      type: 'liquidity',
      message: `Low cash reserves: Only ${(metrics.cash_pct * 100).toFixed(1)}% in cash`,
      severity: 'medium'
    });
  }

  if (metrics.short_exposure > metrics.total_value * 0.3) {
    warnings.push({
      type: 'leverage',
      message: `High short exposure: ${((metrics.short_exposure / metrics.total_value) * 100).toFixed(1)}% of portfolio`,
      severity: 'high'
    });
  }

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-6">
        <Shield className="h-5 w-5" />
        <h3 className="text-lg font-semibold">Risk Analysis</h3>
      </div>

      {/* Overall Risk Score */}
      <div className={`rounded-lg p-4 mb-6 ${riskLevel.bgColor} border-2 ${riskLevel.color.replace('text-', 'border-')}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <RiskIcon className={`h-6 w-6 ${riskLevel.color}`} />
            <span className={`font-semibold ${riskLevel.color}`}>{riskLevel.label}</span>
          </div>
          <span className={`text-2xl font-bold ${riskLevel.color}`}>
            {metrics.risk_score.toFixed(0)}/100
          </span>
        </div>
        <div className="h-2 bg-white rounded-full overflow-hidden">
          <div
            className={`h-full transition-all ${
              metrics.risk_score < 30
                ? 'bg-green-500'
                : metrics.risk_score < 60
                ? 'bg-yellow-500'
                : 'bg-red-500'
            }`}
            style={{ width: `${metrics.risk_score}%` }}
          ></div>
        </div>
      </div>

      {/* Risk Metrics */}
      <div className="space-y-4 mb-6">
        {/* Diversification */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">Diversification Score</span>
            <span className="text-sm font-semibold">{metrics.diversification_score.toFixed(0)}/100</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${
                metrics.diversification_score > 70
                  ? 'bg-green-500'
                  : metrics.diversification_score > 40
                  ? 'bg-yellow-500'
                  : 'bg-red-500'
              }`}
              style={{ width: `${metrics.diversification_score}%` }}
            ></div>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {metrics.positions_count} position{metrics.positions_count !== 1 ? 's' : ''} in portfolio
          </p>
        </div>

        {/* Position Concentration */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">Largest Position</span>
            <span className="text-sm font-semibold">{(metrics.largest_position_pct * 100).toFixed(1)}%</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${
                metrics.largest_position_pct > 0.5
                  ? 'bg-red-500'
                  : metrics.largest_position_pct > 0.3
                  ? 'bg-yellow-500'
                  : 'bg-green-500'
              }`}
              style={{ width: `${metrics.largest_position_pct * 100}%` }}
            ></div>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Recommended max: 20-30% per position
          </p>
        </div>
      </div>

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-semibold flex items-center gap-1">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            Risk Warnings
          </p>
          {warnings.map((warning, index) => (
            <div
              key={index}
              className={`text-xs p-2 rounded ${
                warning.severity === 'high'
                  ? 'bg-red-50 text-red-700 border border-red-200'
                  : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
              }`}
            >
              {warning.message}
            </div>
          ))}
        </div>
      )}

      {/* Recommendations */}
      {warnings.length === 0 && (
        <div className="bg-green-50 border border-green-200 rounded p-3">
          <div className="flex items-center gap-2 text-green-700">
            <CheckCircle className="h-4 w-4" />
            <span className="text-sm font-semibold">Portfolio Health: Good</span>
          </div>
          <p className="text-xs text-green-600 mt-1">
            Your portfolio has balanced risk metrics
          </p>
        </div>
      )}
    </Card>
  );
}
