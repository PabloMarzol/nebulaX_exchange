import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { useLiveData } from '../../contexts/LiveDataContext';
import { useOrderbook } from '../../hooks/useMarketData';
import { formatNumber } from '../../lib/utils';

interface OrderbookProps {
  symbol: string;
}

interface OrderbookLevel {
  price: string;
  size: string;
  total: number;
}

export function Orderbook({ symbol }: OrderbookProps) {
  const { orderbooks, subscribe, unsubscribe } = useLiveData();
  const { data: orderbookData } = useOrderbook(symbol);
  const [asks, setAsks] = useState<OrderbookLevel[]>([]);
  const [bids, setBids] = useState<OrderbookLevel[]>([]);
  const [maxTotal, setMaxTotal] = useState(0);

  // Subscribe to WebSocket updates
  useEffect(() => {
    if (symbol) {
      subscribe('market', symbol);
    }
    return () => {
      if (symbol) {
        unsubscribe('market', symbol);
      }
    };
  }, [symbol, subscribe, unsubscribe]);

  // Process orderbook data
  useEffect(() => {
    const liveOrderbook = orderbooks[symbol];
    const dataToProcess = liveOrderbook || orderbookData;

    if (!dataToProcess || !dataToProcess.levels) return;

    const [askLevels = [], bidLevels = []] = dataToProcess.levels;

    // Process asks (sorted ascending by price)
    const processedAsks: OrderbookLevel[] = [];
    let askTotal = 0;
    for (const [price, size] of askLevels.slice(0, 15)) {
      askTotal += parseFloat(size);
      processedAsks.push({
        price,
        size,
        total: askTotal,
      });
    }

    // Process bids (sorted descending by price)
    const processedBids: OrderbookLevel[] = [];
    let bidTotal = 0;
    for (const [price, size] of bidLevels.slice(0, 15)) {
      bidTotal += parseFloat(size);
      processedBids.push({
        price,
        size,
        total: bidTotal,
      });
    }

    setAsks(processedAsks.reverse()); // Reverse to show highest ask at bottom
    setBids(processedBids);
    setMaxTotal(Math.max(askTotal, bidTotal));
  }, [symbol, orderbooks, orderbookData]);

  const renderOrderbookRow = (
    level: OrderbookLevel,
    isBid: boolean
  ) => {
    const percentage = maxTotal > 0 ? (level.total / maxTotal) * 100 : 0;

    return (
      <div
        key={`${level.price}-${level.size}`}
        className="relative grid grid-cols-3 gap-2 px-3 py-1 text-sm font-mono hover:bg-zinc-800/50 transition-colors"
      >
        {/* Depth visualization */}
        <div
          className={`absolute inset-y-0 ${isBid ? 'right-0' : 'left-0'} ${
            isBid ? 'bg-green-500/10' : 'bg-red-500/10'
          }`}
          style={{ width: `${percentage}%` }}
        />

        {/* Price */}
        <div
          className={`relative z-10 ${
            isBid ? 'text-green-400' : 'text-red-400'
          }`}
        >
          {formatNumber(parseFloat(level.price), 2)}
        </div>

        {/* Size */}
        <div className="relative z-10 text-right text-zinc-300">
          {formatNumber(parseFloat(level.size), 4)}
        </div>

        {/* Total */}
        <div className="relative z-10 text-right text-zinc-500">
          {formatNumber(level.total, 4)}
        </div>
      </div>
    );
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Orderbook</CardTitle>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden p-0">
        {/* Column headers */}
        <div className="grid grid-cols-3 gap-2 px-3 py-2 text-xs font-semibold text-zinc-400 border-b border-zinc-800">
          <div>Price (USD)</div>
          <div className="text-right">Size</div>
          <div className="text-right">Total</div>
        </div>

        {/* Asks */}
        <div className="overflow-y-auto max-h-[calc(50%-2rem)]">
          {asks.length > 0 ? (
            asks.map((level) => renderOrderbookRow(level, false))
          ) : (
            <div className="px-3 py-8 text-center text-sm text-zinc-500">
              No asks available
            </div>
          )}
        </div>

        {/* Spread */}
        {asks.length > 0 && bids.length > 0 && (
          <div className="px-3 py-2 text-center bg-zinc-900 border-y border-zinc-800">
            <div className="text-xs text-zinc-500">Spread</div>
            <div className="text-sm font-mono text-zinc-300">
              {formatNumber(
                parseFloat(asks[asks.length - 1].price) - parseFloat(bids[0].price),
                2
              )}
            </div>
          </div>
        )}

        {/* Bids */}
        <div className="overflow-y-auto max-h-[calc(50%-2rem)]">
          {bids.length > 0 ? (
            bids.map((level) => renderOrderbookRow(level, true))
          ) : (
            <div className="px-3 py-8 text-center text-sm text-zinc-500">
              No bids available
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
