/**
 * Portfolio Performance Chart Component
 * Displays historical portfolio value over time with interactive chart
 */
import { useState } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface ChartDataPoint {
  date: string;
  value: number;
  change: number;
}

interface PortfolioPerformanceChartProps {
  data?: ChartDataPoint[];
  timeframe: string;
  currentValue: number;
}

// Generate mock historical data
const generateMockData = (days: number, baseValue: number): ChartDataPoint[] => {
  const data: ChartDataPoint[] = [];
  let value = baseValue * 0.7; // Start at 70% of current value
  const now = new Date();

  for (let i = days; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const change = (Math.random() - 0.45) * (baseValue * 0.02); // Slight upward bias
    value += change;

    data.push({
      date: date.toISOString().split('T')[0],
      value: Math.max(value, baseValue * 0.5), // Don't go below 50% of current
      change: change
    });
  }

  // Ensure last value is close to current
  if (data.length > 0) {
    data[data.length - 1].value = baseValue;
  }

  return data;
};

export function PortfolioPerformanceChart({ data, timeframe, currentValue }: PortfolioPerformanceChartProps) {
  const [hoveredPoint, setHoveredPoint] = useState<ChartDataPoint | null>(null);

  // Use mock data if none provided
  const timeframeDays = {
    '1D': 1,
    '1W': 7,
    '1M': 30,
    '3M': 90,
    '1Y': 365,
    'All': 730
  };

  const chartData = data || generateMockData(timeframeDays[timeframe as keyof typeof timeframeDays] || 30, currentValue);

  if (chartData.length === 0) {
    return null;
  }

  // Calculate statistics
  const firstValue = chartData[0].value;
  const lastValue = chartData[chartData.length - 1].value;
  const totalChange = lastValue - firstValue;
  const totalChangePercent = (totalChange / firstValue) * 100;
  const isPositive = totalChange >= 0;

  // Calculate chart dimensions
  const width = 800;
  const height = 200;
  const padding = { top: 10, right: 10, bottom: 30, left: 50 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const maxValue = Math.max(...chartData.map(d => d.value));
  const minValue = Math.min(...chartData.map(d => d.value));
  const valueRange = maxValue - minValue;

  // Create SVG path
  const points = chartData.map((point, index) => {
    const x = padding.left + (index / (chartData.length - 1)) * chartWidth;
    const y = padding.top + chartHeight - ((point.value - minValue) / valueRange) * chartHeight;
    return { x, y, data: point };
  });

  const pathD = points.map((point, index) =>
    `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`
  ).join(' ');

  // Create gradient fill path
  const fillPathD = `${pathD} L ${points[points.length - 1].x} ${height - padding.bottom} L ${padding.left} ${height - padding.bottom} Z`;

  const displayValue = hoveredPoint ? hoveredPoint.value : lastValue;
  const displayDate = hoveredPoint ? new Date(hoveredPoint.date).toLocaleDateString() : 'Current';

  return (
    <div className="space-y-4">
      {/* Stats Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white tracking-tight">
              ${displayValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-sm text-zinc-500">{displayDate}</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            {isPositive ? (
              <TrendingUp className="h-4 w-4 text-emerald-400" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-400" />
            )}
            <span className={`text-sm font-medium ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
              {isPositive ? '+' : ''}{totalChange.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className={`text-xs ${isPositive ? 'text-emerald-400/70' : 'text-red-400/70'}`}>
              ({isPositive ? '+' : ''}{totalChangePercent.toFixed(2)}%)
            </span>
            <span className="text-xs text-zinc-500">• {timeframe}</span>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="relative">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full"
          style={{ minHeight: '200px' }}
          onMouseLeave={() => setHoveredPoint(null)}
        >
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = padding.top + chartHeight * (1 - ratio);
            const value = minValue + valueRange * ratio;
            return (
              <g key={ratio}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="currentColor"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                  className="text-zinc-800"
                />
                <text
                  x={padding.left - 10}
                  y={y + 4}
                  textAnchor="end"
                  className="text-[10px] fill-zinc-500"
                >
                  ${(value / 1000).toFixed(0)}k
                </text>
              </g>
            );
          })}

          {/* Gradient definition */}
          <defs>
            <linearGradient id="chartGradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={isPositive ? "#10b981" : "#ef4444"} stopOpacity="0.2" />
              <stop offset="100%" stopColor={isPositive ? "#10b981" : "#ef4444"} stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Fill area */}
          <path
            d={fillPathD}
            fill="url(#chartGradient)"
          />

          {/* Line */}
          <path
            d={pathD}
            fill="none"
            stroke={isPositive ? "#10b981" : "#ef4444"}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Interactive points */}
          {points.map((point, index) => (
            <circle
              key={index}
              cx={point.x}
              cy={point.y}
              r="4"
              fill={isPositive ? "#10b981" : "#ef4444"}
              className="opacity-0 hover:opacity-100 transition-opacity cursor-pointer"
              onMouseEnter={() => setHoveredPoint(point.data)}
            />
          ))}

          {/* Hovered point indicator */}
          {hoveredPoint && points.find(p => p.data === hoveredPoint) && (
            <g>
              <line
                x1={points.find(p => p.data === hoveredPoint)!.x}
                y1={padding.top}
                x2={points.find(p => p.data === hoveredPoint)!.x}
                y2={height - padding.bottom}
                stroke="currentColor"
                strokeWidth="1"
                strokeDasharray="2 2"
                className="text-zinc-600"
              />
              <circle
                cx={points.find(p => p.data === hoveredPoint)!.x}
                cy={points.find(p => p.data === hoveredPoint)!.y}
                r="4"
                fill={isPositive ? "#10b981" : "#ef4444"}
                className="animate-pulse"
              />
            </g>
          )}

          {/* X-axis labels */}
          {chartData.length > 1 && [0, Math.floor(chartData.length / 2), chartData.length - 1].map((index) => {
            if (index >= chartData.length) return null;
            const point = points[index];
            const date = new Date(chartData[index].date);
            const label = timeframe === '1D'
              ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : date.toLocaleDateString([], { month: 'short', day: 'numeric' });

            return (
              <text
                key={index}
                x={point.x}
                y={height - 10}
                textAnchor="middle"
                className="text-[10px] fill-zinc-500"
              >
                {label}
              </text>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
