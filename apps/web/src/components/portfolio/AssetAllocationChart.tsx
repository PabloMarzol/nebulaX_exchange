/**
 * Asset Allocation Chart Component
 * Displays portfolio allocation as a pie chart
 */
import { Card } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Portfolio } from '@/lib/api/aiService';
import { PieChart as PieChartIcon } from 'lucide-react';

interface AssetAllocationChartProps {
  portfolio: Portfolio;
  currentPrices?: { [ticker: string]: number };
  isLoading?: boolean;
}

const COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // yellow
  '#ef4444', // red
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f97316', // orange
];

export function AssetAllocationChart({ portfolio, currentPrices = {}, isLoading }: AssetAllocationChartProps) {
  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <PieChartIcon className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Asset Allocation</h3>
        </div>
        <div className="h-64 flex items-center justify-center animate-pulse">
          <div className="h-48 w-48 rounded-full bg-gray-200"></div>
        </div>
      </Card>
    );
  }

  // Calculate allocation data
  const allocationData: Array<{ name: string; value: number; percentage: number }> = [];
  let totalValue = portfolio.cash;

  // Add positions
  Object.entries(portfolio.positions).forEach(([ticker, position]) => {
    const currentPrice = currentPrices[ticker] || position.long_cost_basis;
    const positionValue = position.long * currentPrice;

    if (positionValue > 0) {
      allocationData.push({
        name: ticker,
        value: positionValue,
        percentage: 0 // Will calculate after we have total
      });
      totalValue += positionValue;
    }
  });

  // Add cash as an asset
  if (portfolio.cash > 0) {
    allocationData.push({
      name: 'Cash',
      value: portfolio.cash,
      percentage: 0
    });
  }

  // Calculate percentages
  allocationData.forEach(item => {
    item.percentage = (item.value / totalValue) * 100;
  });

  // Sort by value descending
  allocationData.sort((a, b) => b.value - a.value);

  if (allocationData.length === 0) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <PieChartIcon className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Asset Allocation</h3>
        </div>
        <div className="text-center text-muted-foreground py-8">
          <PieChartIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>No assets in portfolio</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <PieChartIcon className="h-5 w-5" />
        <h3 className="text-lg font-semibold">Asset Allocation</h3>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={allocationData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percentage }) => `${name} ${percentage.toFixed(1)}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {allocationData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number) =>
              `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            }
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>

      {/* Allocation Table */}
      <div className="mt-6 space-y-2">
        {allocationData.map((item, index) => (
          <div key={item.name} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              ></div>
              <span className="font-medium">{item.name}</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-muted-foreground">
                ${item.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="font-semibold w-12 text-right">{item.percentage.toFixed(1)}%</span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
