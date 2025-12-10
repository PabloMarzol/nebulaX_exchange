/**
 * AI Analysis Loading Component
 * Shows animated loading states with descriptions of AI analysis steps
 */
import { useEffect, useState } from 'react';
import { Brain, TrendingUp, Newspaper, Globe, BarChart3, Shield, Sparkles, Check } from 'lucide-react';

interface AIAnalysisLoadingProps {
  isAnalyzing: boolean;
}

interface AnalysisStep {
  id: string;
  label: string;
  description: string;
  icon: any;
  duration: number; // in ms
}

const ANALYSIS_STEPS: AnalysisStep[] = [
  {
    id: 'fetch-data',
    label: 'Fetching Market Data',
    description: 'Retrieving latest crypto prices and market information...',
    icon: Globe,
    duration: 2000
  },
  {
    id: 'fetch-news',
    label: 'Analyzing Latest News',
    description: 'Scanning recent news articles and market sentiment...',
    icon: Newspaper,
    duration: 2500
  },
  {
    id: 'market-context',
    label: 'Understanding Market Context',
    description: 'Analyzing overall crypto market trends and conditions...',
    icon: TrendingUp,
    duration: 2000
  },
  {
    id: 'technical-analysis',
    label: 'Running Technical Analysis',
    description: 'Evaluating chart patterns and technical indicators...',
    icon: BarChart3,
    duration: 2500
  },
  {
    id: 'risk-assessment',
    label: 'Assessing Portfolio Risk',
    description: 'Calculating risk metrics and position sizing...',
    icon: Shield,
    duration: 2000
  },
  {
    id: 'agent-synthesis',
    label: 'Synthesizing AI Agent Signals',
    description: 'Combining insights from all AI agents using Groq/Llama...',
    icon: Brain,
    duration: 3000
  },
  {
    id: 'complete',
    label: 'Analysis Complete',
    description: 'Generating final recommendations and insights...',
    icon: Sparkles,
    duration: 1000
  }
];

export function AIAnalysisLoading({ isAnalyzing }: AIAnalysisLoadingProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);

  useEffect(() => {
    if (!isAnalyzing) {
      setCurrentStepIndex(0);
      setCompletedSteps([]);
      return;
    }

    const currentStep = ANALYSIS_STEPS[currentStepIndex];
    if (!currentStep) return;

    const timer = setTimeout(() => {
      setCompletedSteps(prev => [...prev, currentStep.id]);

      if (currentStepIndex < ANALYSIS_STEPS.length - 1) {
        setCurrentStepIndex(prev => prev + 1);
      }
    }, currentStep.duration);

    return () => clearTimeout(timer);
  }, [isAnalyzing, currentStepIndex]);

  if (!isAnalyzing) return null;

  const currentStep = ANALYSIS_STEPS[currentStepIndex];
  const progress = ((completedSteps.length) / ANALYSIS_STEPS.length) * 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="glass-panel p-8 rounded-2xl border border-white/10 bg-black/50 max-w-2xl w-full mx-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 rounded-full mb-4">
            <Brain className="h-8 w-8 text-white animate-pulse" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">AI Analysis in Progress</h2>
          <p className="text-sm text-zinc-400">
            Our AI agents are analyzing your portfolio...
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-blue-500 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-zinc-500">
            <span>{completedSteps.length} of {ANALYSIS_STEPS.length} steps</span>
            <span>{Math.round(progress)}%</span>
          </div>
        </div>

        {/* Current Step */}
        {currentStep && (
          <div className="mb-6 p-4 rounded-xl bg-white/5 border border-white/10">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-emerald-500/20 rounded-lg border border-emerald-500/30">
                <currentStep.icon className="h-6 w-6 text-emerald-400 animate-bounce" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-white mb-1">{currentStep.label}</h3>
                <p className="text-xs text-zinc-400">{currentStep.description}</p>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                <div className="w-2 h-2 bg-emerald-500/50 rounded-full animate-pulse delay-75" />
                <div className="w-2 h-2 bg-emerald-500/25 rounded-full animate-pulse delay-150" />
              </div>
            </div>
          </div>
        )}

        {/* All Steps */}
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {ANALYSIS_STEPS.map((step, index) => {
            const isCompleted = completedSteps.includes(step.id);
            const isCurrent = currentStepIndex === index;
            const isUpcoming = index > currentStepIndex;

            return (
              <div
                key={step.id}
                className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                  isCurrent
                    ? 'bg-white/10 border border-white/20'
                    : isCompleted
                    ? 'bg-emerald-500/5 border border-emerald-500/10'
                    : 'bg-zinc-900/50 border border-zinc-800'
                }`}
              >
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all ${
                    isCompleted
                      ? 'bg-emerald-500/20 border border-emerald-500/30'
                      : isCurrent
                      ? 'bg-blue-500/20 border border-blue-500/30'
                      : 'bg-zinc-800 border border-zinc-700'
                  }`}
                >
                  {isCompleted ? (
                    <Check className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <step.icon
                      className={`h-4 w-4 ${
                        isCurrent ? 'text-blue-400' : 'text-zinc-500'
                      }`}
                    />
                  )}
                </div>
                <div className="flex-1">
                  <p
                    className={`text-xs font-medium ${
                      isCompleted
                        ? 'text-emerald-400'
                        : isCurrent
                        ? 'text-white'
                        : 'text-zinc-500'
                    }`}
                  >
                    {step.label}
                  </p>
                </div>
                {isCurrent && (
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-ping" />
                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-ping delay-75" />
                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-ping delay-150" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-xs text-zinc-500">
            Powered by <span className="text-white font-semibold">Groq/Llama 3.3 70B</span>
          </p>
        </div>
      </div>
    </div>
  );
}
