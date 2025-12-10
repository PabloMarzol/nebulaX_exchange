/**
 * Watchlist Component
 * Allows users to monitor and track specific assets
 */
import { useState } from 'react';
import { Star, TrendingUp, TrendingDown, Plus, X, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface WatchlistAsset {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  changePercent24h: number;
  isFavorite: boolean;
}

interface WatchlistProps {
  assets?: WatchlistAsset[];
  onAddAsset?: (symbol: string) => void;
  onRemoveAsset?: (symbol: string) => void;
  onToggleFavorite?: (symbol: string) => void;
}

// Generate mock watchlist
const generateMockWatchlist = (): WatchlistAsset[] => {
  const assets = [
    { symbol: 'BTC', name: 'Bitcoin', basePrice: 95000 },
    { symbol: 'ETH', name: 'Ethereum', basePrice: 3500 },
    { symbol: 'SOL', name: 'Solana', basePrice: 145 },
    { symbol: 'AVAX', name: 'Avalanche', basePrice: 42 },
    { symbol: 'LINK', name: 'Chainlink', basePrice: 18 }
  ];

  return assets.map((asset, index) => {
    const changePercent = (Math.random() * 20 - 5);
    const price = asset.basePrice * (1 + changePercent / 100);

    return {
      symbol: asset.symbol,
      name: asset.name,
      price,
      change24h: price - asset.basePrice,
      changePercent24h: changePercent,
      isFavorite: index < 2
    };
  });
};

export function Watchlist({ assets, onAddAsset, onRemoveAsset, onToggleFavorite }: WatchlistProps) {
  const [watchlistAssets, setWatchlistAssets] = useState<WatchlistAsset[]>(
    assets || generateMockWatchlist()
  );
  const [isAdding, setIsAdding] = useState(false);
  const [newSymbol, setNewSymbol] = useState('');

  const handleToggleFavorite = (symbol: string) => {
    if (onToggleFavorite) {
      onToggleFavorite(symbol);
    } else {
      setWatchlistAssets((prev) =>
        prev.map((asset) =>
          asset.symbol === symbol ? { ...asset, isFavorite: !asset.isFavorite } : asset
        )
      );
    }
  };

  const handleRemove = (symbol: string) => {
    if (onRemoveAsset) {
      onRemoveAsset(symbol);
    } else {
      setWatchlistAssets((prev) => prev.filter((asset) => asset.symbol !== symbol));
    }
  };

  const handleAdd = () => {
    if (newSymbol.trim() && onAddAsset) {
      onAddAsset(newSymbol.trim().toUpperCase());
      setNewSymbol('');
      setIsAdding(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Eye className="h-5 w-5 text-white" />
          <h3 className="text-sm font-medium text-white">Watchlist</h3>
          <span className="text-xs text-zinc-500">({watchlistAssets.length})</span>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setIsAdding(!isAdding)}
          className="h-7 bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800"
        >
          <Plus className="h-3 w-3 mr-1" />
          Add
        </Button>
      </div>

      {/* Add Asset Form */}
      {isAdding && (
        <div className="glass-panel p-3 rounded-lg border border-white/10 bg-white/[0.04]">
          <div className="flex gap-2">
            <input
              type="text"
              value={newSymbol}
              onChange={(e) => setNewSymbol(e.target.value)}
              placeholder="Enter symbol (e.g., BTC)"
              className="flex-1 px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white text-sm focus:outline-none focus:border-zinc-700"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAdd();
                if (e.key === 'Escape') setIsAdding(false);
              }}
              autoFocus
            />
            <Button
              size="sm"
              onClick={handleAdd}
              className="bg-white text-black hover:bg-zinc-200"
            >
              Add
            </Button>
          </div>
        </div>
      )}

      {/* Watchlist Items */}
      <div className="space-y-2">
        {watchlistAssets.map((asset) => {
          const isPositive = asset.changePercent24h >= 0;

          return (
            <div
              key={asset.symbol}
              className="glass-panel p-3 rounded-lg border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors group"
            >
              <div className="flex items-center justify-between">
                {/* Left: Asset Info */}
                <div className="flex items-center gap-3 flex-1">
                  <button
                    onClick={() => handleToggleFavorite(asset.symbol)}
                    className="transition-colors"
                  >
                    <Star
                      className={`h-4 w-4 ${
                        asset.isFavorite
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-zinc-600 hover:text-zinc-400'
                      }`}
                    />
                  </button>
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
                </div>

                {/* Right: Change and Remove */}
                <div className="flex items-center gap-2">
                  <div className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-bold ${
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
                  <button
                    onClick={() => handleRemove(asset.symbol)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-500/10 rounded"
                  >
                    <X className="h-4 w-4 text-red-400" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {watchlistAssets.length === 0 && (
        <div className="text-center py-8 text-zinc-500">
          <Eye className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No assets in watchlist</p>
          <p className="text-xs mt-1">Click "Add" to start monitoring assets</p>
        </div>
      )}
    </div>
  );
}
