/**
 * Profit/Loss Tracker Component
 * Displays daily, weekly, monthly P&L breakdown with visual indicators
 */
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

interface ProfitLossData {
  daily: { amount: number; percentage: number };
  weekly: { amount: number; percentage: number };
  monthly: { amount: number; percentage: number };
  allTime: { amount: number; percentage: number };
}

interface ProfitLossTrackerProps {
  data?: ProfitLossData;
  currentValue: number;
}

// Generate mock P&L data
const generateMockPL = (currentValue: number): ProfitLossData => {
  return {
    daily: {
      amount: currentValue * (Math.random() * 0.04 - 0.01), // -1% to +3%
      percentage: (Math.random() * 4 - 1)
    },
    weekly: {
      amount: currentValue * (Math.random() * 0.08 - 0.02), // -2% to +6%
      percentage: (Math.random() * 8 - 2)
    },
    monthly: {
      amount: currentValue * (Math.random() * 0.15 - 0.03), // -3% to +12%
      percentage: (Math.random() * 15 - 3)
    },
    allTime: {
      amount: currentValue * 0.42, // 42% gain
      percentage: 42
    }
  };
};

export function ProfitLossTracker({ data, currentValue }: ProfitLossTrackerProps) {
  const plData = data || generateMockPL(currentValue);

  const periods = [
    { label: 'Today', key: 'daily', ...plData.daily },
    { label: 'This Week', key: 'weekly', ...plData.weekly },
    { label: 'This Month', key: 'monthly', ...plData.monthly },
    { label: 'All Time', key: 'allTime', ...plData.allTime }
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {periods.map((period) => {
        const isPositive = period.amount >= 0;
        const absAmount = Math.abs(period.amount);
        const absPercentage = Math.abs(period.percentage);

        return (
          <div
            key={period.key}
            className={`glass-panel p-4 rounded-xl border relative overflow-hidden group ${
              isPositive
                ? 'border-emerald-500/20 bg-emerald-500/[0.02]'
                : 'border-red-500/20 bg-red-500/[0.02]'
            }`}
          >
            {/* Background Icon */}
            <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity">
              {isPositive ? (
                <TrendingUp className="w-12 h-12" />
              ) : (
                <TrendingDown className="w-12 h-12" />
              )}
            </div>

            {/* Content */}
            <div className="relative">
              <div className="flex items-center gap-2 mb-3">
                <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                  {period.label}
                </h4>
              </div>

              {/* P&L Amount */}
              <div className="flex items-baseline gap-1 mb-1">
                <span
                  className={`text-xl font-bold tracking-tight ${
                    isPositive ? 'text-emerald-400' : 'text-red-400'
                  }`}
                >
                  {isPositive ? '+' : '-'}${absAmount.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                </span>
              </div>

              {/* Percentage */}
              <div className="flex items-center gap-2">
                <div
                  className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold ${
                    isPositive
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : 'bg-red-500/10 text-red-400'
                  }`}
                >
                  {isPositive ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <TrendingDown className="w-3 h-3" />
                  )}
                  <span>
                    {isPositive ? '+' : '-'}{absPercentage.toFixed(2)}%
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-3 w-full bg-zinc-800 h-1 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isPositive ? 'bg-emerald-500' : 'bg-red-500'
                  }`}
                  style={{
                    width: `${Math.min(Math.abs(period.percentage) * 2, 100)}%`
                  }}
                ></div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
