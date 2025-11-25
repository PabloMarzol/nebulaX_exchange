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

    // Hyperliquid API returns [bids, asks]
    // levels[0] -> bids (descending)
    // levels[1] -> asks (ascending)
    const [rawBids = [], rawAsks = []] = dataToProcess.levels;

    // Validate that we have arrays
    if (!Array.isArray(rawBids) || !Array.isArray(rawAsks)) {
      console.warn('[Orderbook] Invalid orderbook data format:', dataToProcess);
      return;
    }

    // Process asks (sorted ascending by price)
    const processedAsks: OrderbookLevel[] = [];
    let askTotal = 0;
    try {
      for (const level of rawAsks.slice(0, 15)) {
        let price, size;
        if (Array.isArray(level) && level.length >= 2) {
          [price, size] = level;
        } else if (typeof level === 'object' && level !== null && 'px' in level && 'sz' in level) {
          price = (level as any).px;
          size = (level as any).sz;
        } else {
          continue;
        }
        
        askTotal += parseFloat(size);
        processedAsks.push({
          price,
          size,
          total: askTotal,
        });
      }
    } catch (err) {
      console.error('[Orderbook] Error processing asks:', err);
    }

    // Process bids (sorted descending by price)
    const processedBids: OrderbookLevel[] = [];
    let bidTotal = 0;
    try {
      for (const level of rawBids.slice(0, 15)) {
        let price, size;
        if (Array.isArray(level) && level.length >= 2) {
          [price, size] = level;
        } else if (typeof level === 'object' && level !== null && 'px' in level && 'sz' in level) {
          price = (level as any).px;
          size = (level as any).sz;
        } else {
          continue;
        }

        bidTotal += parseFloat(size);
        processedBids.push({
          price,
          size,
          total: bidTotal,
        });
      }
    } catch (err) {
      console.error('[Orderbook] Error processing bids:', err);
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
        className="relative grid grid-cols-3 px-2 py-[2px] text-xs font-mono hover:bg-zinc-800/50 transition-colors"
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
          className={`relative z-10 text-left ${
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
    <Card className="h-full flex flex-col bg-zinc-950 border-zinc-800">
      <CardHeader className="pb-2 pt-3 px-3">
        <CardTitle className="text-sm font-medium text-zinc-200">Orderbook</CardTitle>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden p-0 flex flex-col">
        {/* Column headers */}
        <div className="grid grid-cols-3 px-2 py-1 text-[11px] font-medium text-zinc-500 mb-1">
          <div className="text-left">Price (USD)</div>
          <div className="text-right">Size</div>
          <div className="text-right">Total</div>
        </div>

        {/* Asks */}
        <div className="flex-1 overflow-hidden flex flex-col justify-end">
          <div className="overflow-y-auto scrollbar-hide">
            {asks.length > 0 ? (
              asks.map((level) => renderOrderbookRow(level, false))
            ) : (
              <div className="px-3 py-4 text-center text-xs text-zinc-600">
                No asks
              </div>
            )}
          </div>
        </div>

        {/* Spread */}
        {asks.length > 0 && bids.length > 0 && (
          <div className="px-3 py-1 my-1 text-center bg-zinc-900/50 border-y border-zinc-800/50 flex justify-between items-center">
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Spread</div>
            <div className="text-xs font-mono text-zinc-300">
              {formatNumber(
                parseFloat(asks[asks.length - 1].price) - parseFloat(bids[0].price),
                2
              )} 
              <span className="text-zinc-600 ml-1 text-[10px]">
                ({((parseFloat(asks[asks.length - 1].price) - parseFloat(bids[0].price)) / parseFloat(bids[0].price) * 100).toFixed(3)}%)
              </span>
            </div>
          </div>
        )}

        {/* Bids */}
        <div className="flex-1 overflow-hidden">
          <div className="overflow-y-auto scrollbar-hide h-full">
            {bids.length > 0 ? (
              bids.map((level) => renderOrderbookRow(level, true))
            ) : (
              <div className="px-3 py-4 text-center text-xs text-zinc-600">
                No bids
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
