import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { TradingChart } from '../components/trading/TradingChart';
import { Orderbook } from '../components/trading/Orderbook';
import { OrderForm } from '../components/trading/OrderForm';
import { PositionPanel } from '../components/trading/PositionPanel';
import { OrderManagement } from '../components/trading/OrderManagement';
import { MarketSelector } from '../components/trading/MarketSelector';
import { usePrices } from '../hooks/useMarketData';

export function TradingPage() {
  const [selectedSymbol, setSelectedSymbol] = useState('BTC');
  const { data: prices } = usePrices(selectedSymbol);

  const currentPrice = prices?.[selectedSymbol] ? parseFloat(prices[selectedSymbol]) : undefined;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-zinc-950">
      {/* Header with Market Selector */}
      <div className="flex items-center justify-between px-2 py-1 border-b border-zinc-800">
        <MarketSelector value={selectedSymbol} onChange={setSelectedSymbol} />
      </div>

      {/* Main Trading Layout */}
      <div className="flex-1 grid grid-cols-12 gap-2 min-h-0 p-1">
        {/* Left: Chart + Bottom Panels */}
        <div className="col-span-9 flex flex-col gap-1 min-h-0">
          {/* Trading Chart */}
          <div className="flex-[2] min-h-0 rounded-sm overflow-hidden border border-zinc-900">
            <TradingChart symbol={selectedSymbol} />
          </div>

          {/* Positions and Orders Tabs */}
          <div className="flex-1 min-h-0 overflow-auto">
            <Tabs defaultValue="positions" className="h-full">
              <TabsList className="w-full justify-start border-b border-zinc-800 rounded-none bg-transparent p-0">
                <TabsTrigger
                  value="positions"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500"
                >
                  Positions
                </TabsTrigger>
                <TabsTrigger
                  value="orders"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500"
                >
                  Open Orders
                </TabsTrigger>
              </TabsList>
              <TabsContent value="positions" className="mt-4">
                <PositionPanel symbol={selectedSymbol} />
              </TabsContent>
              <TabsContent value="orders" className="mt-4">
                <OrderManagement symbol={selectedSymbol} />
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Right: Orderbook + Order Form */}
        <div className="col-span-3 flex flex-col gap-2 min-h-100">
          {/* Orderbook */}
          <div className="flex-0 min-h-10 rounded-sm overflow-hidden">
            <Orderbook symbol={selectedSymbol} />
          </div>

          {/* Order Form */}
          <div className="h-[500px]">
            <OrderForm symbol={selectedSymbol} currentPrice={currentPrice} />
          </div>
        </div>
      </div>
    </div>
  );
}
