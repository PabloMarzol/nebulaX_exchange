/**
 * Market Overview Component
 * Displays top gainers, losers, and market trends
 */
import { TrendingUp, TrendingDown, Activity, Flame, Snowflake } from 'lucide-react';
import { useState } from 'react';

interface MarketAsset {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  changePercent24h: number;
  volume24h: number;
  marketCap: number;
}

interface MarketOverviewProps {
  assets?: MarketAsset[];
}

// Generate mock market data
const generateMockMarket = (): MarketAsset[] => {
  const cryptoAssets = [
    { symbol: 'BTC', name: 'Bitcoin', basePrice: 95000 },
    { symbol: 'ETH', name: 'Ethereum', basePrice: 3500 },
    { symbol: 'SOL', name: 'Solana', basePrice: 145 },
    { symbol: 'ADA', name: 'Cardano', basePrice: 0.65 },
    { symbol: 'DOT', name: 'Polkadot', basePrice: 8.5 },
    { symbol: 'AVAX', name: 'Avalanche', basePrice: 42 },
    { symbol: 'MATIC', name: 'Polygon', basePrice: 1.2 },
    { symbol: 'LINK', name: 'Chainlink', basePrice: 18 },
    { symbol: 'UNI', name: 'Uniswap', basePrice: 12 },
    { symbol: 'ATOM', name: 'Cosmos', basePrice: 11 }
  ];

  return cryptoAssets.map((asset) => {
    const changePercent = (Math.random() * 30 - 10); // -10% to +20%
    const price = asset.basePrice * (1 + changePercent / 100);
    const change = price - asset.basePrice;

    return {
      symbol: asset.symbol,
      name: asset.name,
      price,
      change24h: change,
      changePercent24h: changePercent,
      volume24h: Math.random() * 1000000000,
      marketCap: price * (Math.random() * 100000000 + 10000000)
    };
  });
};

export function MarketOverview({ assets }: MarketOverviewProps) {
  const [activeTab, setActiveTab] = useState<'gainers' | 'losers' | 'volume'>('gainers');
  const marketData = assets || generateMockMarket();

  // Sort based on active tab
  const sortedData = [...marketData].sort((a, b) => {
    switch (activeTab) {
      case 'gainers':
        return b.changePercent24h - a.changePercent24h;
      case 'losers':
        return a.changePercent24h - b.changePercent24h;
      case 'volume':
        return b.volume24h - a.volume24h;
      default:
        return 0;
    }
  }).slice(0, 5);

  const tabs = [
    { id: 'gainers' as const, label: 'Top Gainers', icon: Flame, color: 'text-emerald-400' },
    { id: 'losers' as const, label: 'Top Losers', icon: Snowflake, color: 'text-red-400' },
    { id: 'volume' as const, label: 'Volume', icon: Activity, color: 'text-blue-400' }
  ];

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-2">
        {tabs.map((tab) => {
          const TabIcon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-white/10 text-white border border-white/10'
                  : 'bg-zinc-900 text-zinc-500 border border-zinc-800 hover:bg-zinc-800 hover:text-zinc-300'
              }`}
            >
              <TabIcon className={`h-4 w-4 ${isActive ? tab.color : ''}`} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Assets List */}
      <div className="space-y-2">
        {sortedData.map((asset, index) => {
          const isPositive = asset.changePercent24h >= 0;

          return (
            <div
              key={asset.symbol}
              className="glass-panel p-4 rounded-lg border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors group"
            >
              <div className="flex items-center justify-between">
                {/* Left: Rank and Asset Info */}
                <div className="flex items-center gap-3 flex-1">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-zinc-900 text-zinc-500 text-xs font-bold">
                    {index + 1}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-white">
                      {asset.symbol.substring(0, 2)}
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-white">{asset.symbol}</h4>
                      <p className="text-xs text-zinc-500">{asset.name}</p>
                    </div>
                  </div>
                </div>

                {/* Center: Price */}
                <div className="flex-1 text-center">
                  <div className="text-sm font-bold text-white">
                    ${asset.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  {activeTab === 'volume' && (
                    <div className="text-xs text-zinc-500">
                      Vol: ${(asset.volume24h / 1000000).toFixed(1)}M
                    </div>
                  )}
                </div>

                {/* Right: Change */}
                <div className="flex-1 text-right">
                  <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-sm font-bold ${
                    isPositive
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : 'bg-red-500/10 text-red-400'
                  }`}>
                    {isPositive ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    <span>
                      {isPositive ? '+' : ''}{asset.changePercent24h.toFixed(2)}%
                    </span>
                  </div>
                  <div className={`text-xs mt-1 ${isPositive ? 'text-emerald-400/70' : 'text-red-400/70'}`}>
                    {isPositive ? '+' : ''}${Math.abs(asset.change24h).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-3 w-full bg-zinc-800 h-1 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isPositive ? 'bg-emerald-500' : 'bg-red-500'
                  }`}
                  style={{
                    width: `${Math.min(Math.abs(asset.changePercent24h) * 5, 100)}%`
                  }}
                ></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
