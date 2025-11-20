import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { usePositions } from '../../hooks/useMarketData';
import { formatNumber, formatPercentage } from '../../lib/utils';

interface PositionPanelProps {
  symbol?: string;
}

export function PositionPanel({ symbol }: PositionPanelProps) {
  const { data: positions, isLoading } = usePositions(symbol);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Positions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-sm text-zinc-400 py-4">Loading positions...</div>
        </CardContent>
      </Card>
    );
  }

  if (!positions || positions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Positions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-sm text-zinc-400 py-4">No open positions</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Positions</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-zinc-900 border-b border-zinc-800">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-semibold text-zinc-400">Symbol</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-zinc-400">Side</th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-zinc-400">Size</th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-zinc-400">Entry</th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-zinc-400">Mark</th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-zinc-400">Liq. Price</th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-zinc-400">PnL</th>
              </tr>
            </thead>
            <tbody>
              {positions.map((position, idx) => {
                const pnl = parseFloat(position.unrealizedPnl);
                const pnlPercent = (pnl / parseFloat(position.margin)) * 100;

                return (
                  <tr key={idx} className="border-b border-zinc-800 hover:bg-zinc-900/50">
                    <td className="px-4 py-3 text-sm font-medium">{position.symbol}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-semibold px-2 py-1 rounded ${
                          position.side === 'long'
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-red-500/20 text-red-400'
                        }`}
                      >
                        {position.side.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-mono">
                      {formatNumber(position.quantity, 4)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-mono">
                      ${formatNumber(parseFloat(position.entryPrice), 2)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-mono">
                      ${formatNumber(parseFloat(position.markPrice), 2)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-mono text-zinc-400">
                      {position.liquidationPrice
                        ? `$${formatNumber(parseFloat(position.liquidationPrice), 2)}`
                        : 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className={`text-sm font-semibold ${pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        ${formatNumber(pnl, 2)}
                      </div>
                      <div className={`text-xs ${pnl >= 0 ? 'text-green-400/70' : 'text-red-400/70'}`}>
                        {formatPercentage(pnlPercent)}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
