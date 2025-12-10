import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Search, ArrowUpDown } from 'lucide-react';
import { Link } from 'wouter';
import axios from 'axios';

interface MarketData {
  symbol: string;
  price: string | null;
  change?: number;
  changePercent?: number;
  volume?: number;
  high?: number;
  low?: number;
}

export function MarketsPage() {
  const [markets, setMarkets] = useState<MarketData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'symbol' | 'price' | 'change'>('symbol');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMarketData();
    // Refresh prices every 10 seconds
    const interval = setInterval(fetchMarketData, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchMarketData = async () => {
    try {
      // Fetch symbols and prices in parallel
      const [symbolsRes, pricesRes] = await Promise.all([
        axios.get('/api/market/symbols'),
        axios.get('/api/market/prices')
      ]);

      if (symbolsRes.data.success && pricesRes.data.success) {
        const symbols = symbolsRes.data.data.symbols;
        const prices = pricesRes.data.data;

        // Combine symbol data with prices
        const marketData: MarketData[] = symbols.map((sym: any) => ({
          symbol: sym.symbol,
          price: prices[sym.symbol] || null,
          maxLeverage: sym.maxLeverage
        }));

        setMarkets(marketData);
      }
    } catch (error) {
      console.error('Error fetching market data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredMarkets = markets.filter(m =>
    m.symbol.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedMarkets = [...filteredMarkets].sort((a, b) => {
    let aVal, bVal;

    switch (sortBy) {
      case 'symbol':
        return sortOrder === 'asc'
          ? a.symbol.localeCompare(b.symbol)
          : b.symbol.localeCompare(a.symbol);
      case 'price':
        aVal = parseFloat(a.price || '0');
        bVal = parseFloat(b.price || '0');
        break;
      case 'change':
        aVal = a.changePercent || 0;
        bVal = b.changePercent || 0;
        break;
      default:
        return 0;
    }

    return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
  });

  const toggleSort = (column: typeof sortBy) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold mb-2">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
            Markets
          </span>
        </h1>
        <p className="text-muted-foreground">
          Trade perpetual futures with up to 50x leverage
        </p>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search markets..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-4 py-3 rounded-lg border border-primary/20 bg-background/50 backdrop-blur-sm focus:outline-none focus:border-primary/50 transition-colors"
        />
      </div>

      {/* Markets Table */}
      <div className="rounded-2xl border border-primary/20 bg-card/30 backdrop-blur-sm overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-4 p-4 border-b border-primary/10 bg-primary/5 font-semibold text-sm">
          <div
            className="col-span-3 flex items-center gap-2 cursor-pointer hover:text-primary transition-colors"
            onClick={() => toggleSort('symbol')}
          >
            Symbol
            <ArrowUpDown className="w-4 h-4" />
          </div>
          <div
            className="col-span-3 flex items-center gap-2 cursor-pointer hover:text-primary transition-colors"
            onClick={() => toggleSort('price')}
          >
            Price
            <ArrowUpDown className="w-4 h-4" />
          </div>
          <div
            className="col-span-2 flex items-center gap-2 cursor-pointer hover:text-primary transition-colors"
            onClick={() => toggleSort('change')}
          >
            24h Change
            <ArrowUpDown className="w-4 h-4" />
          </div>
          <div className="col-span-2">Volume</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>

        {/* Table Body */}
        <div className="divide-y divide-primary/10">
          {loading ? (
            <div className="p-12 text-center text-muted-foreground">
              Loading markets...
            </div>
          ) : sortedMarkets.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              No markets found
            </div>
          ) : (
            sortedMarkets.map((market, index) => (
              <motion.div
                key={market.symbol}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.02 }}
                className="grid grid-cols-12 gap-4 p-4 hover:bg-primary/5 transition-colors"
              >
                {/* Symbol */}
                <div className="col-span-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="font-bold text-primary text-sm">
                      {market.symbol.slice(0, 2)}
                    </span>
                  </div>
                  <div>
                    <div className="font-semibold">{market.symbol}</div>
                    <div className="text-xs text-muted-foreground">Perpetual</div>
                  </div>
                </div>

                {/* Price */}
                <div className="col-span-3 flex items-center">
                  <span className="font-mono text-lg">
                    {market.price ? `$${parseFloat(market.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'N/A'}
                  </span>
                </div>

                {/* 24h Change */}
                <div className="col-span-2 flex items-center">
                  {market.changePercent !== undefined ? (
                    <div className={`flex items-center gap-1 ${market.changePercent >= 0 ? 'text-success' : 'text-error'}`}>
                      {market.changePercent >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                      <span className="font-semibold">
                        {market.changePercent >= 0 ? '+' : ''}{market.changePercent.toFixed(2)}%
                      </span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </div>

                {/* Volume */}
                <div className="col-span-2 flex items-center text-muted-foreground">
                  {market.volume ? `$${(market.volume / 1000000).toFixed(2)}M` : '-'}
                </div>

                {/* Actions */}
                <div className="col-span-2 flex items-center justify-end gap-2">
                  <Link href={`/trading/${market.symbol}`}>
                    <a className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition-all hover:scale-105">
                      Trade
                    </a>
                  </Link>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Market Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl border border-primary/20 bg-card/30 backdrop-blur-sm">
          <div className="text-sm text-muted-foreground mb-2">Total Markets</div>
          <div className="text-3xl font-bold text-primary">{markets.length}</div>
        </div>
        <div className="p-6 rounded-2xl border border-primary/20 bg-card/30 backdrop-blur-sm">
          <div className="text-sm text-muted-foreground mb-2">24h Volume</div>
          <div className="text-3xl font-bold text-primary">$2.5B+</div>
        </div>
        <div className="p-6 rounded-2xl border border-primary/20 bg-card/30 backdrop-blur-sm">
          <div className="text-sm text-muted-foreground mb-2">Active Traders</div>
          <div className="text-3xl font-bold text-primary">50K+</div>
        </div>
      </div>
    </div>
  );
}
