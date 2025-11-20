import React, { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useSymbols, usePrices } from '../../hooks/useMarketData';
import { formatNumber, formatPercentage } from '../../lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface MarketSelectorProps {
  value: string;
  onChange: (symbol: string) => void;
}

export function MarketSelector({ value, onChange }: MarketSelectorProps) {
  const { data: symbolsData, isLoading } = useSymbols();
  const { data: prices } = usePrices();

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-zinc-900 rounded-lg">
        <div className="text-sm text-zinc-400">Loading markets...</div>
      </div>
    );
  }

  const symbols = symbolsData?.symbols || [];
  const currentPrice = prices && value ? prices[value] : null;

  return (
    <div className="flex items-center gap-4">
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Select market" />
        </SelectTrigger>
        <SelectContent>
          {symbols.map((symbol) => {
            const price = prices?.[symbol.symbol];
            return (
              <SelectItem key={symbol.symbol} value={symbol.symbol}>
                <div className="flex items-center justify-between gap-4">
                  <span className="font-semibold">{symbol.symbol}</span>
                  {price && (
                    <span className="text-xs text-zinc-400 font-mono">
                      ${formatNumber(parseFloat(price), 2)}
                    </span>
                  )}
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>

      {currentPrice && (
        <div className="flex items-center gap-2 px-4 py-2 bg-zinc-900 rounded-lg">
          <span className="text-sm text-zinc-400">Price:</span>
          <span className="text-lg font-semibold font-mono">
            ${formatNumber(parseFloat(currentPrice), 2)}
          </span>
        </div>
      )}
    </div>
  );
}
