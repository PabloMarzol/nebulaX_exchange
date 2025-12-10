/**
 * AI Insights Panel Component
 * Displays AI agent recommendations and confidence levels
 */
import { Card } from '@/components/ui/card';
import { AgentSignal } from '@/lib/api/aiService';
import { Brain, TrendingUp, TrendingDown, Minus, AlertCircle } from 'lucide-react';

interface AIInsightsPanelProps {
  agentSignals: { [agent: string]: AgentSignal };
  isLoading?: boolean;
}

const AGENT_INFO = {
  bill_ackman: {
    name: 'Bill Ackman',
    description: 'Value Investor',
    icon: '💼'
  },
  michael_burry: {
    name: 'Michael Burry',
    description: 'Contrarian',
    icon: '🎯'
  },
  technical_analyst: {
    name: 'Technical Analyst',
    description: 'Chart Patterns',
    icon: '📊'
  },
  risk_manager: {
    name: 'Risk Manager',
    description: 'Risk Assessment',
    icon: '🛡️'
  }
};

function getSignalColor(signal: string): { bg: string; text: string; border: string } {
  switch (signal) {
    case 'bullish':
      return { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' };
    case 'bearish':
      return { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' };
    default:
      return { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' };
  }
}

function getSignalIcon(signal: string) {
  switch (signal) {
    case 'bullish':
      return TrendingUp;
    case 'bearish':
      return TrendingDown;
    default:
      return Minus;
  }
}

export function AIInsightsPanel({ agentSignals, isLoading }: AIInsightsPanelProps) {
  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Brain className="h-5 w-5" />
          <h3 className="text-lg font-semibold">AI Agent Insights</h3>
        </div>
        <div className="space-y-4 animate-pulse">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="border rounded-lg p-4">
              <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-full"></div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  if (!agentSignals || Object.keys(agentSignals).length === 0) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Brain className="h-5 w-5" />
          <h3 className="text-lg font-semibold">AI Agent Insights</h3>
        </div>
        <div className="text-center text-muted-foreground py-8">
          <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>No AI insights available</p>
          <p className="text-sm">Run analysis to get agent recommendations</p>
        </div>
      </Card>
    );
  }

  // Calculate consensus
  const signals = Object.values(agentSignals);
  const bullishCount = signals.filter(s => s.signal === 'bullish').length;
  const bearishCount = signals.filter(s => s.signal === 'bearish').length;
  const neutralCount = signals.filter(s => s.signal === 'neutral').length;

  let consensus = 'neutral';
  if (bullishCount > bearishCount && bullishCount > neutralCount) consensus = 'bullish';
  else if (bearishCount > bullishCount && bearishCount > neutralCount) consensus = 'bearish';

  const avgConfidence = signals.reduce((sum, s) => sum + s.confidence, 0) / signals.length;

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          <h3 className="text-lg font-semibold">AI Agent Insights</h3>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Consensus:</span>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSignalColor(consensus).bg} ${getSignalColor(consensus).text}`}>
              {consensus.toUpperCase()}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Avg Confidence: {avgConfidence.toFixed(0)}%
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {Object.entries(agentSignals).map(([agentKey, signal]) => {
          const agentInfo = AGENT_INFO[agentKey as keyof typeof AGENT_INFO];
          const colors = getSignalColor(signal.signal);
          const SignalIcon = getSignalIcon(signal.signal);

          if (!agentInfo) return null;

          return (
            <div
              key={agentKey}
              className={`border ${colors.border} rounded-lg p-4 ${colors.bg} transition-all hover:shadow-md`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{agentInfo.icon}</span>
                  <div>
                    <h4 className="font-semibold text-sm">{agentInfo.name}</h4>
                    <p className="text-xs text-muted-foreground">{agentInfo.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <SignalIcon className={`h-5 w-5 ${colors.text}`} />
                  <span className={`font-semibold ${colors.text}`}>
                    {signal.confidence.toFixed(0)}%
                  </span>
                </div>
              </div>

              {/* Confidence Bar */}
              <div className="mt-3">
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${signal.signal === 'bullish' ? 'bg-green-500' : signal.signal === 'bearish' ? 'bg-red-500' : 'bg-gray-400'}`}
                    style={{ width: `${signal.confidence}%` }}
                  ></div>
                </div>
              </div>

              {/* Reasoning Summary */}
              {signal.reasoning && typeof signal.reasoning === 'object' && (
                <div className="mt-3 text-xs text-muted-foreground">
                  {signal.reasoning.total_score && (
                    <p>Score: {signal.reasoning.total_score.toFixed(1)}/10</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-6 pt-4 border-t flex items-center justify-center gap-6 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <TrendingUp className="h-3 w-3 text-green-600" />
          <span>Bullish: {bullishCount}</span>
        </div>
        <div className="flex items-center gap-1">
          <Minus className="h-3 w-3 text-gray-600" />
          <span>Neutral: {neutralCount}</span>
        </div>
        <div className="flex items-center gap-1">
          <TrendingDown className="h-3 w-3 text-red-600" />
          <span>Bearish: {bearishCount}</span>
        </div>
      </div>
    </Card>
  );
}
