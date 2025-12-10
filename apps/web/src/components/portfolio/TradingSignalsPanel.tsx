/**
 * Trading Signals Panel Component
 * Displays AI-generated trading recommendations for each asset
 */
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TradingDecision } from '@/lib/api/aiService';
import { ShoppingCart, TrendingDown, Minus, ArrowRightLeft, Activity } from 'lucide-react';

interface TradingSignalsPanelProps {
  decisions: { [ticker: string]: TradingDecision };
  isLoading?: boolean;
  onExecuteTrade?: (decision: TradingDecision) => void;
}

function getActionConfig(action: string): {
  label: string;
  icon: typeof ShoppingCart;
  color: string;
  bgColor: string;
} {
  switch (action) {
    case 'buy':
      return {
        label: 'BUY',
        icon: ShoppingCart,
        color: 'text-green-700',
        bgColor: 'bg-green-50 border-green-200'
      };
    case 'sell':
      return {
        label: 'SELL',
        icon: TrendingDown,
        color: 'text-red-700',
        bgColor: 'bg-red-50 border-red-200'
      };
    case 'short':
      return {
        label: 'SHORT',
        icon: TrendingDown,
        color: 'text-orange-700',
        bgColor: 'bg-orange-50 border-orange-200'
      };
    case 'cover':
      return {
        label: 'COVER',
        icon: ArrowRightLeft,
        color: 'text-blue-700',
        bgColor: 'bg-blue-50 border-blue-200'
      };
    default:
      return {
        label: 'HOLD',
        icon: Minus,
        color: 'text-gray-700',
        bgColor: 'bg-gray-50 border-gray-200'
      };
  }
}

export function TradingSignalsPanel({ decisions, isLoading, onExecuteTrade }: TradingSignalsPanelProps) {
  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Trading Signals</h3>
        </div>
        <div className="space-y-4 animate-pulse">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="border rounded-lg p-4">
              <div className="h-5 bg-gray-200 rounded w-1/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-3/4"></div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  if (!decisions || Object.keys(decisions).length === 0) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Trading Signals</h3>
        </div>
        <div className="text-center text-muted-foreground py-8">
          <Activity className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>No trading signals available</p>
          <p className="text-sm">Run analysis to get AI recommendations</p>
        </div>
      </Card>
    );
  }

  const decisionEntries = Object.entries(decisions);

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Trading Signals</h3>
        </div>
        <span className="text-sm text-muted-foreground">
          {decisionEntries.length} asset{decisionEntries.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="space-y-4">
        {decisionEntries.map(([ticker, decision]) => {
          const actionConfig = getActionConfig(decision.action);
          const ActionIcon = actionConfig.icon;

          return (
            <div
              key={ticker}
              className={`border rounded-lg p-4 ${actionConfig.bgColor} transition-all hover:shadow-md`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="flex flex-col">
                    <h4 className="font-bold text-lg">{ticker}</h4>
                    <span className={`text-xs font-semibold ${actionConfig.color}`}>
                      {actionConfig.label}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <p className="text-sm font-semibold">
                      {decision.quantity > 0 ? decision.quantity.toLocaleString() : '-'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {decision.quantity > 0 ? 'shares' : ''}
                    </p>
                  </div>
                  <ActionIcon className={`h-6 w-6 ${actionConfig.color}`} />
                </div>
              </div>

              {/* Confidence Score */}
              <div className="mb-3">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-muted-foreground">Confidence</span>
                  <span className="text-xs font-semibold">{decision.confidence.toFixed(0)}%</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      decision.confidence > 75
                        ? 'bg-green-500'
                        : decision.confidence > 50
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                    }`}
                    style={{ width: `${decision.confidence}%` }}
                  ></div>
                </div>
              </div>

              {/* Reasoning */}
              <div className="mb-3">
                <p className="text-xs text-muted-foreground mb-1">AI Reasoning:</p>
                <p className="text-sm text-foreground line-clamp-3">{decision.reasoning}</p>
              </div>

              {/* Agent Consensus */}
              {decision.agent_signals && Object.keys(decision.agent_signals).length > 0 && (
                <div className="pt-3 border-t border-gray-200">
                  <p className="text-xs text-muted-foreground mb-2">Agent Consensus:</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(decision.agent_signals).map(([agentKey, signal]) => {
                      const signalColor =
                        signal.signal === 'bullish'
                          ? 'bg-green-100 text-green-700'
                          : signal.signal === 'bearish'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-gray-100 text-gray-700';

                      return (
                        <span
                          key={agentKey}
                          className={`px-2 py-1 rounded-full text-xs font-medium ${signalColor}`}
                          title={`${agentKey}: ${signal.confidence.toFixed(0)}% confidence`}
                        >
                          {agentKey.split('_')[0]} {signal.signal === 'bullish' ? '↑' : signal.signal === 'bearish' ? '↓' : '→'}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Execute Trade Button */}
              {onExecuteTrade && decision.action !== 'hold' && (
                <div className="mt-4">
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() => onExecuteTrade(decision)}
                  >
                    Execute Trade
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
