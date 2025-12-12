/**
 * Create Pie Component
 * Allows users to search for coins and create custom investment portfolios (pies)
 */
import { useState, useMemo } from 'react';
import { Search, Plus, X, PieChart, TrendingUp, Percent, Save, Trash2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSymbols, usePrices, useMarketStats } from '@/hooks/useMarketData';

interface Coin {
  id: string;
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  marketCap: number;
  image?: string;
}

interface PieAsset {
  coin: Coin;
  allocation: number; // percentage
}

interface InvestmentPie {
  id: string;
  name: string;
  description: string;
  assets: PieAsset[];
  totalAllocation: number;
  createdAt: Date;
}

export function CreatePie() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAssets, setSelectedAssets] = useState<PieAsset[]>([]);
  const [pieName, setPieName] = useState('');
  const [pieDescription, setPieDescription] = useState('');
  const [savedPies, setSavedPies] = useState<InvestmentPie[]>([]);
  const [editingPieId, setEditingPieId] = useState<string | null>(null);

  // Fetch real market data
  const { data: symbolsData, isLoading: symbolsLoading } = useSymbols();
  const { data: pricesData, isLoading: pricesLoading } = usePrices();

  // Transform API data into Coin format
  const availableCoins = useMemo<Coin[]>(() => {
    if (!symbolsData?.symbols || !pricesData) return [];

    return symbolsData.symbols.map((symbol, index) => ({
      id: symbol.symbol,
      symbol: symbol.symbol,
      name: symbol.symbol, // API doesn't provide full name, using symbol
      price: parseFloat(pricesData[symbol.symbol] || '0'),
      change24h: 0, // Would need 24h stats API call per symbol
      marketCap: 0, // Not available from current API
    }));
  }, [symbolsData, pricesData]);

  // Filter coins based on search
  const filteredCoins = availableCoins.filter(
    coin =>
      coin.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      coin.name.toLowerCase().includes(searchQuery.toLowerCase())
  ).filter(
    coin => !selectedAssets.find(asset => asset.coin.id === coin.id)
  );

  // Calculate total allocation
  const totalAllocation = selectedAssets.reduce((sum, asset) => sum + asset.allocation, 0);
  const isValidAllocation = totalAllocation === 100;

  // Add coin to pie
  const handleAddCoin = (coin: Coin) => {
    const remainingAllocation = 100 - totalAllocation;
    const defaultAllocation = Math.min(remainingAllocation, Math.floor(100 / (selectedAssets.length + 1)));

    setSelectedAssets([...selectedAssets, { coin, allocation: defaultAllocation }]);
    setSearchQuery('');
  };

  // Remove coin from pie
  const handleRemoveCoin = (coinId: string) => {
    setSelectedAssets(selectedAssets.filter(asset => asset.coin.id !== coinId));
  };

  // Update allocation
  const handleAllocationChange = (coinId: string, newAllocation: number) => {
    setSelectedAssets(
      selectedAssets.map(asset =>
        asset.coin.id === coinId
          ? { ...asset, allocation: Math.max(0, Math.min(100, newAllocation)) }
          : asset
      )
    );
  };

  // Auto-balance allocations
  const handleAutoBalance = () => {
    if (selectedAssets.length === 0) return;

    const equalAllocation = Math.floor(100 / selectedAssets.length);
    const remainder = 100 - equalAllocation * selectedAssets.length;

    setSelectedAssets(
      selectedAssets.map((asset, index) => ({
        ...asset,
        allocation: equalAllocation + (index === 0 ? remainder : 0)
      }))
    );
  };

  // Save pie
  const handleSavePie = () => {
    if (!pieName.trim() || selectedAssets.length === 0 || !isValidAllocation) return;

    const newPie: InvestmentPie = {
      id: editingPieId || `pie-${Date.now()}`,
      name: pieName,
      description: pieDescription,
      assets: selectedAssets,
      totalAllocation,
      createdAt: new Date()
    };

    if (editingPieId) {
      setSavedPies(savedPies.map(pie => (pie.id === editingPieId ? newPie : pie)));
      setEditingPieId(null);
    } else {
      setSavedPies([...savedPies, newPie]);
    }

    // Reset form
    setPieName('');
    setPieDescription('');
    setSelectedAssets([]);
  };

  // Load pie for editing
  const handleEditPie = (pie: InvestmentPie) => {
    setPieName(pie.name);
    setPieDescription(pie.description);
    setSelectedAssets(pie.assets);
    setEditingPieId(pie.id);
  };

  // Delete pie
  const handleDeletePie = (pieId: string) => {
    setSavedPies(savedPies.filter(pie => pie.id !== pieId));
  };

  return (
    <div className="space-y-6">
      {/* Create/Edit Pie Section */}
      <div className="glass-panel p-6 rounded-xl border border-white/5 bg-white/[0.02]">
        <div className="flex items-center gap-2 mb-6">
          <PieChart className="h-5 w-5 text-white" />
          <h3 className="text-lg font-medium text-white">
            {editingPieId ? 'Edit Investment Pie' : 'Create Investment Pie'}
          </h3>
        </div>

        {/* Pie Name and Description */}
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-2">Pie Name *</label>
            <input
              type="text"
              value={pieName}
              onChange={(e) => setPieName(e.target.value)}
              placeholder="e.g., DeFi Giants, Blue Chip Crypto"
              className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white text-sm focus:outline-none focus:border-zinc-700"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-2">Description (Optional)</label>
            <textarea
              value={pieDescription}
              onChange={(e) => setPieDescription(e.target.value)}
              placeholder="Describe your investment strategy..."
              rows={2}
              className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white text-sm focus:outline-none focus:border-zinc-700 resize-none"
            />
          </div>
        </div>

        {/* Search Coins */}
        <div className="mb-6">
          <label className="block text-xs font-medium text-zinc-400 mb-2">Add Assets *</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for coins (BTC, ETH, SOL...)"
              className="w-full pl-10 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white text-sm focus:outline-none focus:border-zinc-700"
            />
          </div>

          {/* Loading State */}
          {(symbolsLoading || pricesLoading) && searchQuery && (
            <div className="mt-2 p-4 bg-zinc-900 border border-zinc-800 rounded-lg text-center">
              <p className="text-sm text-zinc-400">Loading assets...</p>
            </div>
          )}

          {/* No Results */}
          {searchQuery && !symbolsLoading && !pricesLoading && filteredCoins.length === 0 && (
            <div className="mt-2 p-4 bg-zinc-900 border border-zinc-800 rounded-lg text-center">
              <p className="text-sm text-zinc-400">No assets found matching "{searchQuery}"</p>
            </div>
          )}

          {/* Search Results */}
          {searchQuery && !symbolsLoading && !pricesLoading && filteredCoins.length > 0 && (
            <div className="mt-2 max-h-48 overflow-y-auto bg-zinc-900 border border-zinc-800 rounded-lg">
              {filteredCoins.map((coin) => (
                <button
                  key={coin.id}
                  onClick={() => handleAddCoin(coin)}
                  className="w-full flex items-center justify-between p-3 hover:bg-zinc-800 transition-colors border-b border-zinc-800 last:border-b-0"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-white">
                      {coin.symbol.substring(0, 2)}
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-semibold text-white">{coin.symbol}</p>
                      <p className="text-xs text-zinc-500">{coin.name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-white">
                      ${coin.price.toLocaleString()}
                    </p>
                    <p className={`text-xs ${coin.change24h >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {coin.change24h >= 0 ? '+' : ''}{coin.change24h.toFixed(2)}%
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Selected Assets */}
        {selectedAssets.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-medium text-zinc-400">
                Selected Assets ({selectedAssets.length})
              </label>
              <Button
                size="sm"
                variant="outline"
                onClick={handleAutoBalance}
                className="h-7 bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800 text-xs"
              >
                <Percent className="h-3 w-3 mr-1" />
                Auto Balance
              </Button>
            </div>

            <div className="space-y-2">
              {selectedAssets.map((asset) => (
                <div
                  key={asset.coin.id}
                  className="flex items-center gap-3 p-3 bg-zinc-900 border border-zinc-800 rounded-lg"
                >
                  <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-white">
                    {asset.coin.symbol.substring(0, 2)}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-white">{asset.coin.symbol}</p>
                    <p className="text-xs text-zinc-500">{asset.coin.name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={asset.allocation}
                      onChange={(e) => handleAllocationChange(asset.coin.id, parseFloat(e.target.value) || 0)}
                      min="0"
                      max="100"
                      step="1"
                      className="w-16 px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-white text-sm text-center focus:outline-none focus:border-zinc-600"
                    />
                    <span className="text-xs text-zinc-500">%</span>
                    <button
                      onClick={() => handleRemoveCoin(asset.coin.id)}
                      className="p-1 hover:bg-red-500/10 rounded text-red-400"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Total Allocation Indicator */}
            <div className={`mt-3 p-3 rounded-lg border ${
              isValidAllocation
                ? 'bg-emerald-500/10 border-emerald-500/20'
                : 'bg-red-500/10 border-red-500/20'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-zinc-400">Total Allocation</span>
                <span className={`text-sm font-bold ${
                  isValidAllocation ? 'text-emerald-400' : 'text-red-400'
                }`}>
                  {totalAllocation.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    isValidAllocation ? 'bg-emerald-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.min(totalAllocation, 100)}%` }}
                />
              </div>
              {!isValidAllocation && (
                <div className="flex items-center gap-1 mt-2">
                  <AlertCircle className="h-3 w-3 text-red-400" />
                  <p className="text-xs text-red-400">
                    Total allocation must equal 100% (currently {totalAllocation.toFixed(1)}%)
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Save Button */}
        <Button
          onClick={handleSavePie}
          disabled={!pieName.trim() || selectedAssets.length === 0 || !isValidAllocation}
          className="w-full bg-white text-black hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="h-4 w-4 mr-2" />
          {editingPieId ? 'Update Pie' : 'Save Pie'}
        </Button>
      </div>

      {/* Saved Pies */}
      {savedPies.length > 0 && (
        <div className="glass-panel p-6 rounded-xl border border-white/5 bg-white/[0.02]">
          <div className="flex items-center gap-2 mb-4">
            <PieChart className="h-5 w-5 text-white" />
            <h3 className="text-lg font-medium text-white">My Investment Pies</h3>
            <span className="text-xs text-zinc-500">({savedPies.length})</span>
          </div>

          <div className="space-y-3">
            {savedPies.map((pie) => (
              <div
                key={pie.id}
                className="p-4 bg-zinc-900 border border-zinc-800 rounded-lg hover:border-zinc-700 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-white mb-1">{pie.name}</h4>
                    {pie.description && (
                      <p className="text-xs text-zinc-500 mb-2">{pie.description}</p>
                    )}
                    <p className="text-xs text-zinc-600">
                      {pie.assets.length} assets • Created {pie.createdAt.toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditPie(pie)}
                      className="p-2 hover:bg-blue-500/10 rounded text-blue-400 text-xs"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeletePie(pie.id)}
                      className="p-2 hover:bg-red-500/10 rounded text-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Pie Assets */}
                <div className="space-y-2">
                  {pie.assets.map((asset) => (
                    <div key={asset.coin.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-white">
                          {asset.coin.symbol.substring(0, 2)}
                        </div>
                        <span className="text-xs text-zinc-300">{asset.coin.symbol}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-emerald-500 h-full rounded-full"
                            style={{ width: `${asset.allocation}%` }}
                          />
                        </div>
                        <span className="text-xs font-mono text-white w-12 text-right">
                          {asset.allocation.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
