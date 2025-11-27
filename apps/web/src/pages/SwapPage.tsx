import { useState } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import { Repeat, Coins, History } from 'lucide-react';
import { CryptoSwap } from '../components/swap/CryptoSwap';
import { OnRampWidget } from '../components/swap/OnRampWidget';
import { useSwapHistory, useOnRampOrders } from '../hooks/useSwap';
import { Card } from '../components/ui/card';
import { formatDistanceToNow } from 'date-fns';

export function SwapPage() {
  const [activeTab, setActiveTab] = useState('crypto');
  const { data: swapHistory = [] } = useSwapHistory(5);
  const { data: onrampOrders = [] } = useOnRampOrders(5);

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Swap</h1>
        <p className="text-muted-foreground">
          Trade tokens instantly or buy crypto with fiat currency
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Swap Interface */}
        <div className="lg:col-span-2">
          <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
            <Tabs.List className="flex border-b mb-6">
              <Tabs.Trigger
                value="crypto"
                className="flex items-center gap-2 px-4 py-2 border-b-2 transition-colors data-[state=active]:border-primary data-[state=inactive]:border-transparent"
              >
                <Repeat className="w-4 h-4" />
                <span>Crypto Swap</span>
              </Tabs.Trigger>
              <Tabs.Trigger
                value="fiat"
                className="flex items-center gap-2 px-4 py-2 border-b-2 transition-colors data-[state=active]:border-primary data-[state=inactive]:border-transparent"
              >
                <Coins className="w-4 h-4" />
                <span>Buy with Fiat</span>
              </Tabs.Trigger>
            </Tabs.List>

            <Tabs.Content value="crypto">
              <CryptoSwap />
            </Tabs.Content>

            <Tabs.Content value="fiat">
              <OnRampWidget />
            </Tabs.Content>
          </Tabs.Root>
        </div>

        {/* Transaction History Sidebar */}
        <div className="space-y-6">
          {/* Recent Swaps */}
          {activeTab === 'crypto' && swapHistory.length > 0 && (
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <History className="w-4 h-4" />
                <h3 className="font-semibold">Recent Swaps</h3>
              </div>
              <div className="space-y-3">
                {swapHistory.map((swap) => (
                  <div
                    key={swap.id}
                    className="p-3 border rounded-lg hover:bg-accent transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">
                        {swap.sellTokenSymbol} → {swap.buyTokenSymbol}
                      </span>
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          swap.status === 'confirmed'
                            ? 'bg-green-500/10 text-green-600'
                            : swap.status === 'failed'
                            ? 'bg-red-500/10 text-red-600'
                            : 'bg-yellow-500/10 text-yellow-600'
                        }`}
                      >
                        {swap.status}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(swap.createdAt), { addSuffix: true })}
                    </div>
                    {swap.txHash && (
                      <a
                        href={`https://etherscan.io/tx/${swap.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline"
                      >
                        View on Explorer
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Recent OnRamp Orders */}
          {activeTab === 'fiat' && onrampOrders.length > 0 && (
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <History className="w-4 h-4" />
                <h3 className="font-semibold">Recent Orders</h3>
              </div>
              <div className="space-y-3">
                {onrampOrders.map((order) => (
                  <div
                    key={order.id}
                    className="p-3 border rounded-lg hover:bg-accent transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">
                        {order.fiatAmount} {order.fiatCurrency}
                      </span>
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          order.status === 'completed'
                            ? 'bg-green-500/10 text-green-600'
                            : order.status === 'failed'
                            ? 'bg-red-500/10 text-red-600'
                            : 'bg-blue-500/10 text-blue-600'
                        }`}
                      >
                        {order.status}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {order.cryptoCurrency} • {order.network}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Info Card */}
          <Card className="p-4 bg-primary/5">
            <h3 className="font-semibold mb-2">About Swaps</h3>
            <ul className="text-sm text-muted-foreground space-y-2">
              {activeTab === 'crypto' ? (
                <>
                  <li>• Powered by 0x Protocol</li>
                  <li>• Best prices across multiple DEXes</li>
                  <li>• Gasless swaps available</li>
                  <li>• Multi-chain support</li>
                </>
              ) : (
                <>
                  <li>• Powered by OnRamp Money</li>
                  <li>• Support for 9+ fiat currencies</li>
                  <li>• Card & bank transfer options</li>
                  <li>• Crypto delivered to your wallet</li>
                </>
              )}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
