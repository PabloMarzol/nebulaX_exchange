/**
 * Transaction History Component
 * Displays recent portfolio transactions and activities
 */
import { ArrowUpRight, ArrowDownLeft, RefreshCw, TrendingUp, Clock } from 'lucide-react';

interface Transaction {
  id: string;
  type: 'buy' | 'sell' | 'swap' | 'transfer';
  asset: string;
  amount: number;
  price: number;
  total: number;
  timestamp: Date;
  status: 'completed' | 'pending' | 'failed';
}

interface TransactionHistoryProps {
  transactions?: Transaction[];
  limit?: number;
}

// Generate mock transactions
const generateMockTransactions = (count: number): Transaction[] => {
  const types: Transaction['type'][] = ['buy', 'sell', 'swap', 'transfer'];
  const assets = ['BTC', 'ETH', 'SOL', 'USDC', 'USDT'];
  const statuses: Transaction['status'][] = ['completed', 'completed', 'completed', 'pending'];

  return Array.from({ length: count }, (_, i) => {
    const type = types[Math.floor(Math.random() * types.length)];
    const asset = assets[Math.floor(Math.random() * assets.length)];
    const amount = Math.random() * 10;
    const price = Math.random() * 50000 + 1000;

    return {
      id: `tx-${i}-${Date.now()}`,
      type,
      asset,
      amount,
      price,
      total: amount * price,
      timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Last 7 days
      status: statuses[Math.floor(Math.random() * statuses.length)]
    };
  }).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
};

export function TransactionHistory({ transactions, limit = 10 }: TransactionHistoryProps) {
  const txData = transactions || generateMockTransactions(limit);
  const displayTx = txData.slice(0, limit);

  const getTypeConfig = (type: Transaction['type']) => {
    switch (type) {
      case 'buy':
        return {
          icon: ArrowDownLeft,
          label: 'Buy',
          color: 'text-emerald-400',
          bg: 'bg-emerald-500/10',
          border: 'border-emerald-500/20'
        };
      case 'sell':
        return {
          icon: ArrowUpRight,
          label: 'Sell',
          color: 'text-red-400',
          bg: 'bg-red-500/10',
          border: 'border-red-500/20'
        };
      case 'swap':
        return {
          icon: RefreshCw,
          label: 'Swap',
          color: 'text-blue-400',
          bg: 'bg-blue-500/10',
          border: 'border-blue-500/20'
        };
      case 'transfer':
        return {
          icon: TrendingUp,
          label: 'Transfer',
          color: 'text-purple-400',
          bg: 'bg-purple-500/10',
          border: 'border-purple-500/20'
        };
    }
  };

  const getStatusConfig = (status: Transaction['status']) => {
    switch (status) {
      case 'completed':
        return { label: 'Completed', color: 'text-emerald-400' };
      case 'pending':
        return { label: 'Pending', color: 'text-yellow-400' };
      case 'failed':
        return { label: 'Failed', color: 'text-red-400' };
    }
  };

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return 'Just now';
  };

  return (
    <div className="space-y-3">
      {displayTx.map((tx) => {
        const typeConfig = getTypeConfig(tx.type);
        const statusConfig = getStatusConfig(tx.status);
        const TypeIcon = typeConfig.icon;

        return (
          <div
            key={tx.id}
            className={`glass-panel p-4 rounded-lg border ${typeConfig.border} ${typeConfig.bg} group hover:border-white/10 transition-colors`}
          >
            <div className="flex items-start justify-between">
              {/* Left: Icon and Details */}
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${typeConfig.bg} border ${typeConfig.border}`}>
                  <TypeIcon className={`h-4 w-4 ${typeConfig.color}`} />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-sm font-semibold text-white">
                      {typeConfig.label} {tx.asset}
                    </h4>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusConfig.color} bg-zinc-900`}>
                      {statusConfig.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    <span>
                      {tx.amount.toFixed(4)} {tx.asset}
                    </span>
                    <span>•</span>
                    <span>
                      @${tx.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 mt-1 text-xs text-zinc-600">
                    <Clock className="h-3 w-3" />
                    <span>{formatTimestamp(tx.timestamp)}</span>
                  </div>
                </div>
              </div>

              {/* Right: Amount */}
              <div className="text-right">
                <div className="text-sm font-bold text-white">
                  ${tx.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className={`text-xs ${typeConfig.color}`}>
                  {tx.type === 'buy' ? '-' : '+'} {tx.amount.toFixed(4)}
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {displayTx.length === 0 && (
        <div className="text-center py-8 text-zinc-500">
          <p className="text-sm">No transactions yet</p>
          <p className="text-xs mt-1">Your transaction history will appear here</p>
        </div>
      )}
    </div>
  );
}
